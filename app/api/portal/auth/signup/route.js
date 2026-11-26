import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/db';
import PortalUser from '@/models/PortalUser';
import { createPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = body?.name?.toString().trim();
    const email = body?.email?.toString().trim().toLowerCase();
    const password = body?.password?.toString();
    const affiliation = body?.affiliation?.toString().trim() || '';

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const headerList = await headers();
    const ipAddress =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    await connectDB();

    const existing = await PortalUser.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await PortalUser.create({
      name,
      email,
      password: hashedPassword,
      role: 'submitter',
      affiliation,
      status: 'active',
      lastLogin: new Date(),
    });

    await createPortalSession(user._id.toString(), user.role, user.email);

    await logActivity({
      userId: user._id,
      action: 'ACCOUNT_CREATED',
      targetModel: 'PortalUser',
      targetId: user._id,
      details: { email: user.email, role: 'submitter', affiliation },
      ipAddress,
    });

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          affiliation: user.affiliation,
        },
        redirectTo: '/portal/dashboard',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Portal signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
