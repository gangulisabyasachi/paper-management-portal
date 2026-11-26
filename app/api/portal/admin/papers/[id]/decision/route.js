import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function POST(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || !['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const decision = body?.decision;
    const decisionLetter = body?.decisionLetter?.toString().trim() || '';

    if (!['accepted', 'rejected', 'revisions_requested'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be accepted, rejected, or revisions_requested.' },
        { status: 400 }
      );
    }

    await connectDB();
    const paper = await Paper.findById(id);
    if (!paper) {
      return NextResponse.json({ error: 'Paper not found.' }, { status: 404 });
    }

    const previousStatus = paper.status;
    paper.status = decision;
    paper.decisionLetter = decisionLetter;
    paper.decisionDate = new Date();
    await paper.save();

    await logActivity({
      userId: session.userId,
      action: 'DECISION_MADE',
      targetModel: 'Paper',
      targetId: paper._id,
      details: {
        paperId: paper.paperId,
        from: previousStatus,
        decision,
      },
    });

    return NextResponse.json({ paper });
  } catch (error) {
    console.error('POST /api/portal/admin/papers/[id]/decision error:', error);
    return NextResponse.json(
      { error: 'Failed to record editorial decision.' },
      { status: 500 }
    );
  }
}
