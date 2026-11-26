import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import JournalIssue from '@/models/JournalIssue';
import Paper from '@/models/Paper';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function PATCH(request, { params }) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const issueDoc = await JournalIssue.findById(id);
    if (!issueDoc) {
      return NextResponse.json({ error: 'Issue not found.' }, { status: 404 });
    }

    if (body.title !== undefined) issueDoc.title = body.title.trim();
    if (body.description !== undefined) issueDoc.description = body.description.trim();
    if (body.status !== undefined) issueDoc.status = body.status;
    if (body.submissionDeadline !== undefined) {
      issueDoc.submissionDeadline = body.submissionDeadline
        ? new Date(body.submissionDeadline)
        : null;
    }
    if (body.reviewDeadline !== undefined) {
      issueDoc.reviewDeadline = body.reviewDeadline
        ? new Date(body.reviewDeadline)
        : null;
    }
    if (body.editorInChief !== undefined) {
      issueDoc.editorInChief = body.editorInChief || null;
    }
    if (body.volume !== undefined) issueDoc.volume = Number(body.volume);
    if (body.issue !== undefined) issueDoc.issue = Number(body.issue);

    await issueDoc.save();

    await logActivity({
      userId: session.userId,
      action: 'ISSUE_UPDATED',
      targetModel: 'JournalIssue',
      targetId: issueDoc._id,
      details: { title: issueDoc.title, status: issueDoc.status },
    });

    return NextResponse.json({ issue: issueDoc });
  } catch (error) {
    console.error('PATCH /api/portal/admin/issues/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update issue.' },
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

    const linkedPapers = await Paper.countDocuments({ targetIssue: id });
    if (linkedPapers > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete issue: ${linkedPapers} paper(s) are linked to it. Archive or close it instead.`,
        },
        { status: 400 }
      );
    }

    const deleted = await JournalIssue.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Issue not found.' }, { status: 404 });
    }

    await logActivity({
      userId: session.userId,
      action: 'ISSUE_DELETED',
      targetModel: 'JournalIssue',
      targetId: id,
      details: { title: deleted.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/portal/admin/issues/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete issue.' },
      { status: 500 }
    );
  }
}
