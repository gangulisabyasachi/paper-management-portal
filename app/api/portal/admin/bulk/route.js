import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import { autoAssignReviewers } from '@/lib/portal/autoAssign';
import logActivity from '@/lib/portal/activityLogger';

export async function POST(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || !['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, paperIds = [], reviewerIds = [], deadline, autoAssign } = body;

    await connectDB();

    if (action === 'export') {
      const query = paperIds.length > 0 ? { _id: { $in: paperIds } } : {};
      const papers = await Paper.find(query)
        .populate('targetIssue', 'volume issue title')
        .populate('submittedBy', 'name email affiliation')
        .sort({ createdAt: -1 })
        .lean();

      const escapeCsv = (val) => {
        const s = (val ?? '').toString().replace(/"/g, '""');
        return `"${s}"`;
      };

      const headers = [
        'Paper ID',
        'Title',
        'Submitter Name',
        'Submitter Email',
        'Affiliation',
        'Issue',
        'Status',
        'Version',
        'Keywords',
        'Submitted At',
        'Decision Date',
      ];

      const rows = papers.map((p) => [
        escapeCsv(p.paperId),
        escapeCsv(p.title),
        escapeCsv(p.submittedBy?.name),
        escapeCsv(p.submittedBy?.email),
        escapeCsv(p.submittedBy?.affiliation),
        escapeCsv(
          p.targetIssue
            ? p.targetIssue.title || `Vol ${p.targetIssue.volume} Issue ${p.targetIssue.issue}`
            : ''
        ),
        escapeCsv(p.status),
        escapeCsv(p.currentVersion),
        escapeCsv((p.keywords || []).join('; ')),
        escapeCsv(p.createdAt ? new Date(p.createdAt).toISOString() : ''),
        escapeCsv(p.decisionDate ? new Date(p.decisionDate).toISOString() : ''),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      await logActivity({
        userId: session.userId,
        action: 'BULK_OPERATION',
        targetModel: 'Paper',
        details: { operation: 'export_csv', count: papers.length },
      });

      return NextResponse.json({ csv, count: papers.length });
    }

    if (action === 'assign') {
      if (!Array.isArray(paperIds) || paperIds.length === 0) {
        return NextResponse.json(
          { error: 'Please select at least one paper.' },
          { status: 400 }
        );
      }

      let totalAssigned = 0;
      const reviewDeadline = deadline
        ? new Date(deadline)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      if (autoAssign) {
        for (const pid of paperIds) {
          const assigned = await autoAssignReviewers(pid, 2, session.userId);
          totalAssigned += assigned.length;
        }
      } else {
        if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
          return NextResponse.json(
            { error: 'Please select at least one reviewer.' },
            { status: 400 }
          );
        }

        for (const pid of paperIds) {
          const existing = await Review.find({
            paper: pid,
            reviewer: { $in: reviewerIds },
            status: { $ne: 'declined' },
          })
            .select('reviewer')
            .lean();
          const existingSet = new Set(existing.map((r) => r.reviewer.toString()));
          const newReviewerIds = reviewerIds.filter(
            (rid) => !existingSet.has(rid.toString())
          );

          if (newReviewerIds.length > 0) {
            await Review.insertMany(
              newReviewerIds.map((rid) => ({
                paper: pid,
                reviewer: rid,
                status: 'pending',
                deadline: reviewDeadline,
                assignedAt: new Date(),
                assignedBy: session.userId,
              }))
            );
            totalAssigned += newReviewerIds.length;
            await Paper.findOneAndUpdate(
              { _id: pid, status: { $in: ['submitted', 'revised'] } },
              { status: 'under_review' }
            );
          }
        }
      }

      await logActivity({
        userId: session.userId,
        action: 'BULK_OPERATION',
        targetModel: 'Paper',
        details: {
          operation: autoAssign ? 'bulk_auto_assign' : 'bulk_manual_assign',
          paperCount: paperIds.length,
          assignmentsCreated: totalAssigned,
        },
      });

      return NextResponse.json({
        success: true,
        assignmentsCreated: totalAssigned,
      });
    }

    return NextResponse.json({ error: 'Unsupported bulk action.' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/portal/admin/bulk error:', error);
    return NextResponse.json(
      { error: 'Bulk operation failed.' },
      { status: 500 }
    );
  }
}
