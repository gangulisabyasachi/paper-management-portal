import PortalClientLayout from '../PortalClientLayout';

export default function EditorLayout({ children }) {
  return (
    <PortalClientLayout allowedRoles={['editor', 'admin']}>
      {children}
    </PortalClientLayout>
  );
}
