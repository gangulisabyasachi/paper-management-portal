import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import PortalUser from '@/models/PortalUser';
import Review from '@/models/Review';
import { verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function GET(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || !['admin', 'editor'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const query = {};
    if (session.role === 'editor') {
      // Editors can list active reviewers for paper assignment
      query.role = 'reviewer';
    } else if (role && role !== 'all') {
      query.role = role;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const users = await PortalUser.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich reviewers with active and completed review counts
    const reviewStats = await Review.aggregate([
      {
        $group: {
          _id: { reviewer: '$reviewer', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map();
    for (const item of reviewStats) {
      const uid = item._id.reviewer.toString();
      if (!statsMap.has(uid)) {
        statsMap.set(uid, { activeReviews: 0, completedReviews: 0 });
      }
      const entry = statsMap.get(uid);
      if (['pending', 'accepted', 'in_progress'].includes(item._id.status)) {
        entry.activeReviews += item.count;
      } else if (item._id.status === 'completed') {
        entry.completedReviews += item.count;
      }
    }

    const enriched = users.map((u) => {
      const st = statsMap.get(u._id.toString()) || {
        activeReviews: 0,
        completedReviews: 0,
      };
      return { ...u, ...st };
    });

    return NextResponse.json({ users: enriched });
  } catch (error) {
    console.error('GET /api/portal/admin/users error:', error);
    return NextResponse.json(
      { error: 'Failed to load users.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const name = body?.name?.toString().trim();
    const email = body?.email?.toString().trim().toLowerCase();
    const password = body?.password?.toString();
    const role = body?.role?.toString() || 'reviewer';
    const affiliation = body?.affiliation?.toString().trim() || '';
    const expertiseRaw = body?.expertise;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (!['submitter', 'reviewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await PortalUser.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    const expertise = Array.isArray(expertiseRaw)
      ? expertiseRaw.map((t) => t.toString().trim()).filter(Boolean)
      : (expertiseRaw || '')
          .toString()
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

    const hashedPassword = await bcrypt.hash(password, 12);

    const created = await PortalUser.create({
      name,
      email,
      password: hashedPassword,
      role,
      affiliation,
      expertise,
      status: 'active',
      createdBy: session.userId,
    });

    await logActivity({
      userId: session.userId,
      action: 'USER_CREATED',
      targetModel: 'PortalUser',
      targetId: created._id,
      details: { name, email, role, affiliation },
    });

    const safeUser = created.toObject();
    delete safeUser.password;

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/portal/admin/users error:', error);
    return NextResponse.json(
      { error: 'Failed to create user.' },
      { status: 500 }
    );
  }
}
