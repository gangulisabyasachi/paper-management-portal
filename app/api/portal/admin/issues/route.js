import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import JournalIssue from '@/models/JournalIssue';
import Paper from '@/models/Paper';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function GET(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const issues = await JournalIssue.find(query)
      .populate('editorInChief', 'name email affiliation')
      .sort({ volume: -1, issue: -1 })
      .lean();

    const counts = await Paper.aggregate([
      { $group: { _id: '$targetIssue', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const enriched = issues.map((iss) => ({
      ...iss,
      paperCount: countMap.get(iss._id.toString()) || 0,
    }));

    return NextResponse.json({ issues: enriched });
  } catch (error) {
    console.error('GET /api/portal/admin/issues error:', error);
    return NextResponse.json(
      { error: 'Failed to load journal issues.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const volume = Number(body?.volume);
    const issueNum = Number(body?.issue);
    const title =
      body?.title?.toString().trim() ||
      `WISDOM Journal Vol ${volume} Issue ${issueNum}`;
    const description = body?.description?.toString().trim() || '';
    const status = body?.status || 'open';
    const submissionDeadline = body?.submissionDeadline
      ? new Date(body.submissionDeadline)
      : undefined;
    const reviewDeadline = body?.reviewDeadline
      ? new Date(body.reviewDeadline)
      : undefined;
    const editorInChief = body?.editorInChief || undefined;

    if (!volume || !issueNum || Number.isNaN(volume) || Number.isNaN(issueNum)) {
      return NextResponse.json(
        { error: 'Valid volume and issue numbers are required.' },
        { status: 400 }
      );
    }

    await connectDB();

    const exists = await JournalIssue.findOne({
      volume,
      issue: issueNum,
    }).lean();
    if (exists) {
      return NextResponse.json(
        { error: `Vol ${volume} Issue ${issueNum} already exists.` },
        { status: 409 }
      );
    }

    const created = await JournalIssue.create({
      volume,
      issue: issueNum,
      title,
      description,
      status,
      submissionDeadline,
      reviewDeadline,
      editorInChief,
    });

    await logActivity({
      userId: session.userId,
      action: 'ISSUE_CREATED',
      targetModel: 'JournalIssue',
      targetId: created._id,
      details: { volume, issue: issueNum, title },
    });

    return NextResponse.json({ issue: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/portal/admin/issues error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal issue.' },
      { status: 500 }
    );
  }
}
