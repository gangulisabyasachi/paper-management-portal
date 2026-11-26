import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ActivityLog from '@/models/ActivityLog';
import { verifyPortalSession } from '@/lib/portal/session';

export async function GET(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    const query = {};
    if (action && action !== 'all') {
      query.action = action;
    }
    if (userId && userId !== 'all') {
      query.user = userId;
    }
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/portal/admin/activity-log error:', error);
    return NextResponse.json(
      { error: 'Failed to load activity log.' },
      { status: 500 }
    );
  }
}
