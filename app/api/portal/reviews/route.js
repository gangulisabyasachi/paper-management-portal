import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';

export async function GET() {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['reviewer', 'admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const reviews = await Review.find({ reviewer: session.userId })
      .populate({
        path: 'paper',
        select: 'paperId title abstract keywords status currentVersion createdAt targetIssue',
        populate: {
          path: 'targetIssue',
          select: 'volume issue title',
        },
      })
      .sort({ assignedAt: -1 })
      .lean();

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('GET /api/portal/reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to load review assignments.' },
      { status: 500 }
    );
  }
}
