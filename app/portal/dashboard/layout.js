import PortalClientLayout from '../PortalClientLayout';

export default function SubmitterDashboardLayout({ children }) {
  return (
    <PortalClientLayout allowedRoles={['submitter', 'admin']}>
      {children}
    </PortalClientLayout>
  );
}
