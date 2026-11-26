import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import { autoAssignReviewers } from '@/lib/portal/autoAssign';
import logActivity from '@/lib/portal/activityLogger';

export async function POST(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || !['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const paper = await Paper.findById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    // Support auto-assign trigger from admin/editor UI
    if (body?.autoAssign) {
      const count = Number(body.count) || 2;
      const assignedIds = await autoAssignReviewers(id, count, session.userId);
      return NextResponse.json({
        assignedIds,
        message:
          assignedIds.length > 0
            ? `Auto-assigned ${assignedIds.length} reviewer(s).`
            : 'No additional eligible reviewers available.',
      });
    }

    const reviewerIds = Array.isArray(body?.reviewerIds) ? body.reviewerIds : [];
    if (reviewerIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one reviewer.' },
        { status: 400 }
      );
    }

    const deadline = body?.deadline
      ? new Date(body.deadline)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Filter out reviewers who already have an active/completed review for this paper
    const existing = await Review.find({
      paper: id,
      reviewer: { $in: reviewerIds },
      status: { $ne: 'declined' },
    })
      .select('reviewer')
      .lean();
    const existingSet = new Set(existing.map((r) => r.reviewer.toString()));

    const toCreate = reviewerIds.filter((rid) => !existingSet.has(rid.toString()));
    if (toCreate.length === 0) {
      return NextResponse.json(
        { error: 'Selected reviewer(s) are already assigned to this paper.' },
        { status: 400 }
      );
    }

    const reviewDocs = toCreate.map((rid) => ({
      paper: id,
      reviewer: rid,
      status: 'pending',
      deadline,
      assignedAt: new Date(),
      assignedBy: session.userId,
    }));

    const createdReviews = await Review.insertMany(reviewDocs);

    if (['submitted', 'revised'].includes(paper.status)) {
      paper.status = 'under_review';
      await paper.save();
    }

    await logActivity({
      userId: session.userId,
      action: 'REVIEWERS_ASSIGNED',
      targetModel: 'Paper',
      targetId: paper._id,
      details: {
        paperId: paper.paperId,
        reviewerCount: createdReviews.length,
        deadline,
      },
    });

    return NextResponse.json({ reviews: createdReviews }, { status: 201 });
  } catch (error) {
    console.error('POST /api/portal/admin/papers/[id]/assign error:', error);
    return NextResponse.json(
      { error: 'Failed to assign reviewers.' },
      { status: 500 }
    );
  }
}
