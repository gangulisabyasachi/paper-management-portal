import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Paper from '@/models/Paper';
import Review from '@/models/Review';
import PortalUser from '@/models/PortalUser';
import JournalIssue from '@/models/JournalIssue';
import ActivityLog from '@/models/ActivityLog';
import { verifyPortalSession } from '@/lib/portal/session';

export async function GET() {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || !['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const paperFilter = {};
    if (session.role === 'editor') {
      const editorIssues = await JournalIssue.find({
        editorInChief: session.userId,
      })
        .select('_id')
        .lean();
      if (editorIssues.length > 0) {
        paperFilter.targetIssue = { $in: editorIssues.map((i) => i._id) };
      }
    }

    const [
      papers,
      totalReviewers,
      totalSubmitters,
      completedReviews,
      overdueReviewsCount,
      recentActivity,
    ] = await Promise.all([
      Paper.find(paperFilter)
        .populate('targetIssue', 'volume issue title')
        .lean(),
      PortalUser.countDocuments({ role: 'reviewer', status: 'active' }),
      PortalUser.countDocuments({ role: 'submitter', status: 'active' }),
      Review.find({ status: 'completed', completedAt: { $exists: true } })
        .select('assignedAt completedAt')
        .lean(),
      Review.countDocuments({
        status: { $in: ['pending', 'accepted', 'in_progress'] },
        deadline: { $lt: new Date() },
      }),
      ActivityLog.find({})
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
    ]);

    const statusCounts = {
      submitted: 0,
      under_review: 0,
      revisions_requested: 0,
      revised: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0,
    };

    const issueMap = new Map();
    for (const p of papers) {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      }
      if (p.targetIssue) {
        const key = p.targetIssue._id.toString();
        if (!issueMap.has(key)) {
          issueMap.set(key, {
            _id: key,
            title:
              p.targetIssue.title ||
              `Vol ${p.targetIssue.volume} Issue ${p.targetIssue.issue}`,
            count: 0,
          });
        }
        issueMap.get(key).count++;
      }
    }

    const decidedCount = statusCounts.accepted + statusCounts.rejected;
    const acceptanceRate =
      decidedCount > 0
        ? Math.round((statusCounts.accepted / decidedCount) * 100)
        : 0;

    let avgReviewDays = 0;
    if (completedReviews.length > 0) {
      const totalMs = completedReviews.reduce((acc, r) => {
        const start = r.assignedAt ? new Date(r.assignedAt).getTime() : 0;
        const end = r.completedAt ? new Date(r.completedAt).getTime() : 0;
        return end > start ? acc + (end - start) : acc;
      }, 0);
      avgReviewDays = Number(
        (totalMs / completedReviews.length / (1000 * 60 * 60 * 24)).toFixed(1)
      );
    }

    const reviewerWorkload = await Review.aggregate([
      {
        $group: {
          _id: '$reviewer',
          active: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'accepted', 'in_progress']] },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'portalusers',
          localField: '_id',
          foreignField: '_id',
          as: 'reviewerInfo',
        },
      },
      { $unwind: '$reviewerInfo' },
      {
        $project: {
          name: '$reviewerInfo.name',
          email: '$reviewerInfo.email',
          active: 1,
          completed: 1,
        },
      },
      { $sort: { active: -1, completed: -1 } },
      { $limit: 10 },
    ]);

    return NextResponse.json({
      analytics: {
        totalPapers: papers.length,
        statusCounts,
        acceptanceRate,
        avgReviewDays,
        totalReviewers,
        totalSubmitters,
        overdueReviewsCount,
        papersPerIssue: Array.from(issueMap.values()),
        reviewerWorkload,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('GET /api/portal/admin/analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics.' },
      { status: 500 }
    );
  }
}
