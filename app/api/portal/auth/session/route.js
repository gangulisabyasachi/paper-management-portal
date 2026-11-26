import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import PortalUser from '@/models/PortalUser';
import { verifyPortalSession } from '@/lib/portal/session';

export async function GET() {
  try {
    const session = await verifyPortalSession();
    if (!session?.userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    await connectDB();
    const user = await PortalUser.findById(session.userId)
      .select('_id name email role affiliation phone academicDesignation expertise status lastLogin')
      .lean();

    if (!user || user.status !== 'active') {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
