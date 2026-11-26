import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/db';
import PortalUser from '@/models/PortalUser';
import User from '@/lib/models/User';
import { createPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

const ROLE_REDIRECTS = {
  submitter: '/portal/dashboard',
  reviewer: '/portal/reviewer',
  editor: '/portal/editor',
  admin: '/portal/admin',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email?.toString().trim().toLowerCase();
    const password = body?.password?.toString();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const headerList = await headers();
    const ipAddress =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    await connectDB();

    let user = await PortalUser.findOne({ email });

    // Seamless bridge: if a main-website admin logs into the portal for the first time,
    // verify against the main User collection and auto-provision their PortalUser admin account.
    if (!user) {
      const legacyAdmin = await User.findOne({ email, role: 'admin' });
      if (legacyAdmin && legacyAdmin.password) {
        const legacyMatch = await bcrypt.compare(password, legacyAdmin.password);
        if (legacyMatch) {
          user = await PortalUser.create({
            name: legacyAdmin.name,
            email: legacyAdmin.email,
            password: legacyAdmin.password,
            role: 'admin',
            affiliation: 'WISDOM Journal Editorial Office',
            status: 'active',
          });
        }
      }
    }

    if (!user) {
      await logActivity({
        action: 'LOGIN_FAILED',
        targetModel: 'PortalUser',
        details: { email, reason: 'User not found' },
        ipAddress,
      });
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: `Account is ${user.status}. Please contact the portal administrator.` },
        { status: 403 }
      );
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `Account temporarily locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`,
        },
        { status: 423 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000;
      }
      await user.save();

      await logActivity({
        userId: user._id,
        action: user.loginAttempts >= 5 ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        targetModel: 'PortalUser',
        targetId: user._id,
        details: { email, attempts: user.loginAttempts },
        ipAddress,
      });

      const remaining = Math.max(0, 5 - user.loginAttempts);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Invalid email or password. ${remaining} attempt(s) remaining.`
              : 'Too many failed attempts. Account locked for 30 minutes.',
        },
        { status: 401 }
      );
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    await createPortalSession(user._id.toString(), user.role, user.email);

    await logActivity({
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      targetModel: 'PortalUser',
      targetId: user._id,
      details: { email: user.email, role: user.role },
      ipAddress,
    });

    return NextResponse.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        affiliation: user.affiliation,
      },
      redirectTo: ROLE_REDIRECTS[user.role] || '/portal/dashboard',
    });
  } catch (error) {
    console.error('Portal login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
