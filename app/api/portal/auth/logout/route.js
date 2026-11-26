import { NextResponse } from 'next/server';
import { deletePortalSession, verifyPortalSession } from '@/lib/portal/session';
import logActivity from '@/lib/portal/activityLogger';

export async function POST() {
  try {
    const session = await verifyPortalSession();
    if (session?.userId) {
      await logActivity({
        userId: session.userId,
        action: 'LOGOUT',
        targetModel: 'PortalUser',
        targetId: session.userId,
        details: { email: session.email },
      });
    }
    await deletePortalSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portal logout error:', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
