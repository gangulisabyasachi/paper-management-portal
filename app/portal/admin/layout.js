import PortalClientLayout from '../PortalClientLayout';

export default function PortalAdminLayout({ children }) {
  return (
    <PortalClientLayout allowedRoles={['admin']}>
      {children}
    </PortalClientLayout>
  );
}
