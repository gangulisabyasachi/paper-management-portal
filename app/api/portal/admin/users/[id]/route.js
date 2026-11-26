import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import PortalUser from '@/models/PortalUser';
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
    const user = await PortalUser.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (body.name !== undefined) user.name = body.name.trim();
    if (body.role !== undefined && ['submitter', 'reviewer', 'editor', 'admin'].includes(body.role)) {
      user.role = body.role;
    }
    if (body.status !== undefined && ['active', 'inactive', 'suspended'].includes(body.status)) {
      user.status = body.status;
    }
    if (body.affiliation !== undefined) {
      user.affiliation = body.affiliation.trim();
    }
    if (body.expertise !== undefined) {
      user.expertise = Array.isArray(body.expertise)
        ? body.expertise.map((t) => t.toString().trim()).filter(Boolean)
        : body.expertise
            .toString()
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }
    if (body.password && body.password.toString().length >= 8) {
      user.password = await bcrypt.hash(body.password.toString(), 12);
    }

    await user.save();

    await logActivity({
      userId: session.userId,
      action: 'USER_UPDATED',
      targetModel: 'PortalUser',
      targetId: user._id,
      details: { email: user.email, role: user.role, status: user.status },
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('PATCH /api/portal/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update user.' },
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
    if (id === session.userId) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await PortalUser.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    await logActivity({
      userId: session.userId,
      action: 'USER_DEACTIVATED',
      targetModel: 'PortalUser',
      targetId: user._id,
      details: { email: user.email },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('DELETE /api/portal/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate user.' },
      { status: 500 }
    );
  }
}
