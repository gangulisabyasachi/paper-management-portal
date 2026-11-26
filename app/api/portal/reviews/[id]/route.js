import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Review from '@/models/Review';
import Discussion from '@/models/Discussion';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function GET(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const review = await Review.findById(id)
      .populate({
        path: 'paper',
        populate: {
          path: 'targetIssue',
          select: 'volume issue title',
        },
      })
      .populate('reviewer', 'name email affiliation')
      .lean();

    if (!review) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    const isOwner = review.reviewer?._id?.toString() === session.userId;
    if (!isOwner && !['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const discussion = await Discussion.findOne({ paper: review.paper?._id })
      .populate('messages.author', 'name email role')
      .lean();

    return NextResponse.json({
      review,
      discussion: discussion || { paper: review.paper?._id, messages: [] },
    });
  } catch (error) {
    console.error('GET /api/portal/reviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load review.' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const review = await Review.findById(id).populate('paper', 'paperId title');
    if (!review) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    if (
      review.reviewer.toString() !== session.userId &&
      session.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { scores, recommendation, commentsToAuthor, confidentialComments } =
      body;

    if (
      !scores ||
      !recommendation ||
      !commentsToAuthor?.toString().trim()
    ) {
      return NextResponse.json(
        { error: 'Scores, recommendation, and comments to author are required.' },
        { status: 400 }
      );
    }

    review.scores = {
      originality: Number(scores.originality),
      methodology: Number(scores.methodology),
      clarity: Number(scores.clarity),
      significance: Number(scores.significance),
      overall: Number(scores.overall),
    };
    review.recommendation = recommendation;
    review.commentsToAuthor = commentsToAuthor.toString().trim();
    review.confidentialComments = confidentialComments?.toString().trim() || '';
    review.status = 'completed';
    review.completedAt = new Date();
    await review.save();

    await logActivity({
      userId: session.userId,
      action: 'REVIEW_COMPLETED',
      targetModel: 'Paper',
      targetId: review.paper?._id,
      details: {
        paperId: review.paper?.paperId,
        recommendation,
        overallScore: review.scores.overall,
      },
    });

    // Check if all non-declined reviews on this paper are now completed
    const activeReviews = await Review.find({
      paper: review.paper?._id,
      status: { $ne: 'declined' },
    })
      .select('status')
      .lean();

    const allCompleted =
      activeReviews.length > 0 &&
      activeReviews.every((r) => r.status === 'completed');

    return NextResponse.json({ review, allCompleted });
  } catch (error) {
    console.error('POST /api/portal/reviews/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review.' },
      { status: 500 }
    );
  }
}
