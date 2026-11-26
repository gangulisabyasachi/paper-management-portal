import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Discussion from '@/models/Discussion';
import Paper from '@/models/Paper';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

async function canAccessDiscussion(session, paperId) {
  if (['admin', 'editor'].includes(session.role)) return true;
  if (session.role === 'reviewer') {
    const rev = await Review.findOne({ paper: paperId, reviewer: session.userId }).lean();
    return !!rev;
  }
  return false;
}

export async function GET(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    if (!(await canAccessDiscussion(session, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const discussion = await Discussion.findOne({ paper: id })
      .populate('messages.author', 'name email role')
      .lean();

    return NextResponse.json({
      discussion: discussion || { paper: id, messages: [] },
    });
  } catch (error) {
    console.error('GET /api/portal/papers/[id]/discussion error:', error);
    return NextResponse.json(
      { error: 'Failed to load discussion.' },
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
    await connectDB();

    if (!(await canAccessDiscussion(session, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const paper = await Paper.findById(id).select('_id paperId').lean();
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    const body = await request.json();
    const content = body?.content?.toString().trim();
    if (!content) {
      return NextResponse.json(
        { error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    let discussion = await Discussion.findOne({ paper: id });
    if (!discussion) {
      discussion = await Discussion.create({ paper: id, messages: [] });
    }

    discussion.messages.push({
      author: session.userId,
      content,
      createdAt: new Date(),
    });
    await discussion.save();

    await logActivity({
      userId: session.userId,
      action: 'DISCUSSION_MESSAGE',
      targetModel: 'Paper',
      targetId: id,
      details: { paperId: paper.paperId },
    });

    const populated = await Discussion.findById(discussion._id)
      .populate('messages.author', 'name email role')
      .lean();

    return NextResponse.json({ discussion: populated }, { status: 201 });
  } catch (error) {
    console.error('POST /api/portal/papers/[id]/discussion error:', error);
    return NextResponse.json(
      { error: 'Failed to post discussion message.' },
      { status: 500 }
    );
  }
}
