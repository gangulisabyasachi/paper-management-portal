import PortalClientLayout from '../PortalClientLayout';

export default function ReviewerLayout({ children }) {
  return (
    <PortalClientLayout allowedRoles={['reviewer', 'admin']}>
      {children}
    </PortalClientLayout>
  );
}
