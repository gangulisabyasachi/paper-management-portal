import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import PortalUser from '@/models/PortalUser';
import JournalIssue from '@/models/JournalIssue';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import generatePaperId from '@/lib/portal/paperId';
import { autoAssignReviewers } from '@/lib/portal/autoAssign';
import logActivity from '@/lib/portal/activityLogger';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function GET(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const issueId = searchParams.get('issueId');
    const search = searchParams.get('search')?.trim();

    const query = {};

    if (session.role === 'submitter') {
      query.submittedBy = session.userId;
    } else if (session.role === 'reviewer') {
      const assigned = await Review.find({ reviewer: session.userId })
        .select('paper')
        .lean();
      query._id = { $in: assigned.map((r) => r.paper) };
    } else if (session.role === 'editor') {
      // Editors see papers in issues assigned to them, or all if none specifically assigned
      const editorIssues = await JournalIssue.find({
        editorInChief: session.userId,
      })
        .select('_id')
        .lean();
      if (editorIssues.length > 0) {
        query.targetIssue = { $in: editorIssues.map((i) => i._id) };
      }
    }

    if (status && status !== 'all') {
      query.status = status;
    }
    if (issueId && issueId !== 'all') {
      query.targetIssue = issueId;
    }
    if (search) {
      query.$or = [
        { paperId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { keywords: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    const papers = await Paper.find(query)
      .populate('targetIssue', 'volume issue title status submissionDeadline reviewDeadline')
      .populate('submittedBy', 'name email affiliation')
      .sort({ createdAt: -1 })
      .lean();

    // Attach review counts and earliest pending deadline for admin/editor/submitter display
    const paperIds = papers.map((p) => p._id);
    const reviews = await Review.find({ paper: { $in: paperIds } })
      .select('paper status deadline recommendation')
      .lean();

    const reviewMap = new Map();
    for (const r of reviews) {
      const pid = r.paper.toString();
      if (!reviewMap.has(pid)) reviewMap.set(pid, []);
      reviewMap.get(pid).push(r);
    }

    const enriched = papers.map((p) => {
      const pReviews = reviewMap.get(p._id.toString()) || [];
      const completedCount = pReviews.filter((r) => r.status === 'completed').length;
      const activeDeadlines = pReviews
        .filter((r) => r.status !== 'completed' && r.status !== 'declined' && r.deadline)
        .map((r) => new Date(r.deadline).getTime());
      const nearestDeadline = activeDeadlines.length
        ? new Date(Math.min(...activeDeadlines))
        : p.targetIssue?.reviewDeadline || null;

      return {
        ...p,
        reviewStats: {
          total: pReviews.length,
          completed: completedCount,
          nearestDeadline,
        },
      };
    });

    return NextResponse.json({ papers: enriched });
  } catch (error) {
    console.error('GET /api/portal/papers error:', error);
    return NextResponse.json(
      { error: 'Failed to load papers.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['submitter', 'admin'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Only submitters can submit new manuscripts.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const abstract = formData.get('abstract')?.toString().trim();
    const keywordsRaw = formData.get('keywords')?.toString() || '';
    const mainAuthorRaw = formData.get('mainAuthor')?.toString() || '{}';
    const coAuthorsRaw = formData.get('coAuthors')?.toString() || '[]';
    const targetIssueId = formData.get('targetIssueId')?.toString().trim();
    const file = formData.get('file');

    if (!title || !abstract || !targetIssueId || !file) {
      return NextResponse.json(
        { error: 'Title, abstract, target issue, and manuscript PDF are required.' },
        { status: 400 }
      );
    }

    if (typeof file === 'string' || !file.name?.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF manuscript files are accepted.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Manuscript PDF must be 15 MB or smaller.' },
        { status: 400 }
      );
    }

    await connectDB();

    const issue = await JournalIssue.findById(targetIssueId);
    if (!issue) {
      return NextResponse.json(
        { error: 'Selected journal issue was not found.' },
        { status: 404 }
      );
    }
    if (issue.status !== 'open') {
      return NextResponse.json(
        { error: 'This journal issue is no longer accepting submissions.' },
        { status: 400 }
      );
    }
    if (issue.submissionDeadline && new Date(issue.submissionDeadline) < new Date()) {
      return NextResponse.json(
        { error: 'The submission deadline for this issue has passed.' },
        { status: 400 }
      );
    }

    const submitter = await PortalUser.findById(session.userId);
    if (!submitter) {
      return NextResponse.json({ error: 'Submitter account not found.' }, { status: 404 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    let mainAuthorInput = {};
    try {
      mainAuthorInput = JSON.parse(mainAuthorRaw) || {};
    } catch {
      mainAuthorInput = {};
    }

    const mainAuthor = {
      name: (mainAuthorInput.name ?? submitter.name ?? '').toString().trim(),
      email: (mainAuthorInput.email ?? submitter.email ?? '').toString().trim().toLowerCase(),
      phone: (mainAuthorInput.phone ?? '').toString().replace(/\D/g, '').trim(),
      academicDesignation: (mainAuthorInput.academicDesignation ?? '').toString().trim(),
      affiliation: (mainAuthorInput.affiliation ?? submitter.affiliation ?? '').toString().trim(),
    };

    if (
      !mainAuthor.name ||
      !mainAuthor.email ||
      !mainAuthor.phone ||
      !mainAuthor.academicDesignation ||
      !mainAuthor.affiliation
    ) {
      return NextResponse.json(
        {
          error:
            'Main author details require Name, Email, Phone Number, Academic Designation, and Institution Name.',
        },
        { status: 400 }
      );
    }
    if (!emailRegex.test(mainAuthor.email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address for the main author.' },
        { status: 400 }
      );
    }
    if (!phoneRegex.test(mainAuthor.phone)) {
      return NextResponse.json(
        { error: 'Main author phone number must be exactly 10 digits.' },
        { status: 400 }
      );
    }

    let coAuthors = [];
    try {
      const parsed = JSON.parse(coAuthorsRaw);
      if (Array.isArray(parsed)) {
        for (let i = 0; i < parsed.length; i++) {
          const a = parsed[i] || {};
          const normalized = {
            name: (a.name || '').toString().trim(),
            email: (a.email || '').toString().trim().toLowerCase(),
            phone: (a.phone || '').toString().replace(/\D/g, '').trim(),
            academicDesignation: (a.academicDesignation || '').toString().trim(),
            affiliation: (a.affiliation || '').toString().trim(),
          };
          if (
            !normalized.name ||
            !normalized.email ||
            !normalized.phone ||
            !normalized.academicDesignation ||
            !normalized.affiliation
          ) {
            return NextResponse.json(
              {
                error: `Co-Author #${i + 1} requires Name, Email, Phone Number, Academic Designation, and Institution Name.`,
              },
              { status: 400 }
            );
          }
          if (!emailRegex.test(normalized.email)) {
            return NextResponse.json(
              { error: `Co-Author #${i + 1} has an invalid email address.` },
              { status: 400 }
            );
          }
          if (!phoneRegex.test(normalized.phone)) {
            return NextResponse.json(
              { error: `Co-Author #${i + 1} phone number must be exactly 10 digits.` },
              { status: 400 }
            );
          }
          coAuthors.push(normalized);
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid co-authors payload.' },
        { status: 400 }
      );
    }

    // Persist phone & academicDesignation onto submitter profile for future convenience
    let profileUpdated = false;
    if (!submitter.phone && mainAuthor.phone) {
      submitter.phone = mainAuthor.phone;
      profileUpdated = true;
    }
    if (!submitter.academicDesignation && mainAuthor.academicDesignation) {
      submitter.academicDesignation = mainAuthor.academicDesignation;
      profileUpdated = true;
    }
    if (!submitter.affiliation && mainAuthor.affiliation) {
      submitter.affiliation = mainAuthor.affiliation;
      profileUpdated = true;
    }
    if (profileUpdated) {
      await submitter.save();
    }

    const keywords = keywordsRaw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const paperId = await generatePaperId();
    const filename = `${paperId}_v1.pdf`;

    const uploadDir = path.join(process.cwd(), 'uploads', 'papers');
    await fs.mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const authors = [mainAuthor, ...coAuthors];

    const paper = await Paper.create({
      paperId,
      title,
      abstract,
      keywords,
      authors,
      submittedBy: submitter._id,
      targetIssue: issue._id,
      status: 'submitted',
      files: [
        {
          version: 1,
          filename,
          originalName: file.name,
          uploadedAt: new Date(),
          size: file.size,
        },
      ],
      currentVersion: 1,
    });

    const headerList = await headers();
    const ipAddress =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    await logActivity({
      userId: submitter._id,
      action: 'PAPER_SUBMITTED',
      targetModel: 'Paper',
      targetId: paper._id,
      details: {
        paperId: paper.paperId,
        title: paper.title,
        issue: issue.title || `Vol ${issue.volume} Issue ${issue.issue}`,
      },
      ipAddress,
    });

    let assignedReviewers = [];
    try {
      assignedReviewers = await autoAssignReviewers(paper._id.toString(), 2, submitter._id);
    } catch (assignErr) {
      console.error('Auto-assign warning:', assignErr);
    }

    const populated = await Paper.findById(paper._id)
      .populate('targetIssue', 'volume issue title')
      .lean();

    return NextResponse.json(
      {
        paper: populated,
        assignedReviewersCount: assignedReviewers.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/portal/papers error:', error);
    return NextResponse.json(
      { error: 'Failed to submit paper. Please try again.' },
      { status: 500 }
    );
  }
}
