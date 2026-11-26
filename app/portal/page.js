import { redirect } from 'next/navigation';
import { verifyPortalSession } from '@/lib/portal/session';

const ROLE_HOME = {
  submitter: '/portal/dashboard',
  reviewer: '/portal/reviewer',
  editor: '/portal/editor',
  admin: '/portal/admin',
};

export default async function PortalIndexPage() {
  const session = await verifyPortalSession();
  if (!session?.userId) {
    redirect('/portal/login');
  }
  redirect(ROLE_HOME[session.role] || '/portal/login');
}
