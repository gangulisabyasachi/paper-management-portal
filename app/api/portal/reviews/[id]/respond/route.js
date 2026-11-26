import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import { autoAssignReviewers } from '@/lib/portal/autoAssign';
import logActivity from '@/lib/portal/activityLogger';

export async function POST(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const response = body?.response;

    if (!['accepted', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: 'Response must be accepted or declined.' },
        { status: 400 }
      );
    }

    await connectDB();
    const review = await Review.findById(id).populate('paper', 'paperId');
    if (!review) {
      return NextResponse.json({ error: 'Review assignment not found.' }, { status: 404 });
    }

    if (review.reviewer.toString() !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    review.status = response;
    await review.save();

    await logActivity({
      userId: session.userId,
      action: response === 'accepted' ? 'REVIEW_ACCEPTED' : 'REVIEW_DECLINED',
      targetModel: 'Paper',
      targetId: review.paper?._id,
      details: { paperId: review.paper?.paperId },
    });

    // If declined, automatically try to assign 1 replacement reviewer
    let replacementAssigned = [];
    if (response === 'declined' && review.paper?._id) {
      try {
        replacementAssigned = await autoAssignReviewers(
          review.paper._id.toString(),
          1,
          null
        );
      } catch (err) {
        console.error('Replacement auto-assign warning:', err);
      }
    }

    return NextResponse.json({
      review,
      replacementAssignedCount: replacementAssigned.length,
    });
  } catch (error) {
    console.error('POST /api/portal/reviews/[id]/respond error:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment status.' },
      { status: 500 }
    );
  }
}
