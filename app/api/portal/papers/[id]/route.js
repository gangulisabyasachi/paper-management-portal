import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import Review from '@/models/Review';
import Discussion from '@/models/Discussion';
import ActivityLog from '@/models/ActivityLog';
import { verifyPortalSession } from '@/lib/portal/session';
import { canManagePaper } from '@/lib/portal/permissions';
import logActivity from '@/lib/portal/activityLogger';

export async function GET(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const paper = await Paper.findById(id)
      .populate('targetIssue', 'volume issue title status submissionDeadline reviewDeadline editorInChief')
      .populate('submittedBy', 'name email affiliation')
      .lean();

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    // Check access: submitter owns it, reviewer is assigned to it, or admin/editor
    let isAssignedReviewer = false;
    if (session.role === 'reviewer') {
      const assignedReview = await Review.findOne({
        paper: id,
        reviewer: session.userId,
      }).lean();
      isAssignedReviewer = !!assignedReview;
    }

    if (!canManagePaper(session, paper) && !isAssignedReviewer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawReviews = await Review.find({ paper: id })
      .populate('reviewer', 'name email affiliation expertise')
      .sort({ assignedAt: 1 })
      .lean();

    let reviews = [];
    if (['admin', 'editor'].includes(session.role)) {
      reviews = rawReviews;
    } else if (session.role === 'reviewer') {
      reviews = rawReviews.filter(
        (r) => r.reviewer?._id?.toString() === session.userId
      );
    } else if (session.role === 'submitter') {
      // Submitter sees completed reviews' commentsToAuthor, scores, and recommendation
      // once a decision or revision request has been issued (or completed reviews when status allows)
      const reviewsVisible =
        ['accepted', 'rejected', 'revisions_requested', 'revised'].includes(paper.status) ||
        !!paper.decisionDate ||
        !!paper.decisionLetter;

      if (reviewsVisible) {
        reviews = rawReviews
          .filter((r) => r.status === 'completed')
          .map((r, index) => ({
            _id: r._id,
            reviewerLabel: `Reviewer #${index + 1}`,
            status: r.status,
            scores: r.scores,
            recommendation: r.recommendation,
            commentsToAuthor: r.commentsToAuthor,
            completedAt: r.completedAt,
          }));
      }
    }

    let discussion = null;
    if (['admin', 'editor', 'reviewer'].includes(session.role)) {
      discussion = await Discussion.findOne({ paper: id })
        .populate('messages.author', 'name email role')
        .lean();
    }

    let activityLogs = [];
    if (session.role === 'admin') {
      activityLogs = await ActivityLog.find({
        targetModel: 'Paper',
        targetId: id,
      })
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    return NextResponse.json({
      paper,
      reviews,
      discussion: discussion || { paper: id, messages: [] },
      activityLogs,
    });
  } catch (error) {
    console.error('GET /api/portal/papers/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load paper details.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const paper = await Paper.findById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    const body = await request.json();

    // Submitters can only withdraw their own paper
    if (session.role === 'submitter') {
      if (paper.submittedBy.toString() !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (body.status === 'withdrawn') {
        paper.status = 'withdrawn';
        await paper.save();
        await logActivity({
          userId: session.userId,
          action: 'PAPER_WITHDRAWN',
          targetModel: 'Paper',
          targetId: paper._id,
          details: { paperId: paper.paperId },
        });
        return NextResponse.json({ paper });
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const previousStatus = paper.status;
    if (body.status) {
      paper.status = body.status;
      if (['accepted', 'rejected', 'revisions_requested'].includes(body.status)) {
        paper.decisionDate = new Date();
      }
    }
    if (body.decisionLetter !== undefined) {
      paper.decisionLetter = body.decisionLetter;
    }

    await paper.save();

    await logActivity({
      userId: session.userId,
      action: 'PAPER_STATUS_CHANGED',
      targetModel: 'Paper',
      targetId: paper._id,
      details: {
        paperId: paper.paperId,
        from: previousStatus,
        to: paper.status,
      },
    });

    return NextResponse.json({ paper });
  } catch (error) {
    console.error('PATCH /api/portal/papers/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update paper.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const paper = await Paper.findById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    await Review.deleteMany({ paper: id });
    await Discussion.deleteMany({ paper: id });
    await Paper.findByIdAndDelete(id);

    await logActivity({
      userId: session.userId,
      action: 'PAPER_DELETED',
      targetModel: 'Paper',
      targetId: id,
      details: { paperId: paper.paperId, title: paper.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/portal/papers/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete paper.' },
      { status: 500 }
    );
  }
}
