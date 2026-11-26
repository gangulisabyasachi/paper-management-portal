'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const ROLE_HOME = {
  submitter: '/portal/dashboard',
  reviewer: '/portal/reviewer',
  editor: '/portal/editor',
  admin: '/portal/admin',
};

const NAV_BY_ROLE = {
  submitter: [
    { section: 'Submissions' },
    { label: 'My Dashboard', href: '/portal/dashboard', icon: 'home' },
    { label: 'Submit New Paper', href: '/portal/dashboard/submit', icon: 'plus' },
  ],
  reviewer: [
    { section: 'Peer Review' },
    { label: 'Active Assignments', href: '/portal/reviewer', icon: 'clipboard' },
    { label: 'Review History', href: '/portal/reviewer?tab=history', icon: 'clock' },
  ],
  editor: [
    { section: 'Editorial Desk' },
    { label: 'Editor Dashboard', href: '/portal/editor', icon: 'layout' },
    { label: 'Open Issues', href: '/portal/editor#issues', icon: 'book' },
  ],
  admin: [
    { section: 'Overview' },
    { label: 'Master Dashboard', href: '/portal/admin', icon: 'layout' },
    { label: 'All Submissions', href: '/portal/admin/submissions', icon: 'files' },
    { section: 'Journal Operations' },
    { label: 'Manage Issues', href: '/portal/admin/issues', icon: 'book' },
    { label: 'Manage Reviewers', href: '/portal/admin/reviewers', icon: 'users' },
    { label: 'All Users & Roles', href: '/portal/admin/users', icon: 'shield' },
    { section: 'Governance' },
    { label: 'Activity Log', href: '/portal/admin/activity-log', icon: 'scroll' },
  ],
};

function NavIcon({ name }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...props}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'layout':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'files':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'book':
      return (
        <svg {...props}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
}

export default function PortalClientLayout({ children, allowedRoles = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const res = await fetch('/api/portal/auth/session', { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;

        if (!data?.user) {
          router.replace('/portal/login');
          return;
        }

        if (allowedRoles && !allowedRoles.includes(data.user.role)) {
          router.replace(ROLE_HOME[data.user.role] || '/portal/login');
          return;
        }

        setUser(data.user);
      } catch {
        if (active) router.replace('/portal/login');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSession();
    return () => {
      active = false;
    };
  }, [router, allowedRoles]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/portal/auth/logout', { method: 'POST' });
    router.replace('/portal/login');
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6fb' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="portal-skeleton" style={{ width: 48, height: 48, borderRadius: '14px', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.92rem' }}>Loading WISDOM Portal...</p>
        </div>
      </div>
    );
  }

  const navItems = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.submitter;
  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="portal-layout-wrapper">
      <div
        className={`portal-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <div className="portal-brand-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div className="portal-brand-title">WISDOM</div>
            <div className="portal-brand-sub">Manuscript Portal</div>
          </div>
        </div>

        <nav className="portal-sidebar-nav">
          {navItems.map((item, idx) => {
            if (item.section) {
              return (
                <div key={`sec-${idx}`} className="portal-nav-section-label">
                  {item.section}
                </div>
              );
            }
            const cleanHref = item.href.split('?')[0].split('#')[0];
            const isActive =
              pathname === cleanHref ||
              (cleanHref !== '/portal/admin' &&
                cleanHref !== '/portal/dashboard' &&
                cleanHref !== '/portal/reviewer' &&
                cleanHref !== '/portal/editor' &&
                pathname.startsWith(cleanHref));

            return (
              <Link
                key={`${item.href}-${idx}`}
                href={item.href}
                className={`portal-nav-item ${isActive ? 'active' : ''}`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-pill">
            <div className="portal-avatar">{initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {user.role}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="portal-btn portal-btn-outline portal-btn-sm"
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.12)' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="portal-mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                WISDOM Journal • {user.role === 'editor' ? 'Editor-in-Chief' : user.role} Desk
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user.role === 'submitter' && (
              <Link href="/portal/dashboard/submit" className="portal-btn portal-btn-primary portal-btn-sm">
                + Submit Paper
              </Link>
            )}
            <a href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://wisdomj.in'} target="_blank" rel="noopener noreferrer" className="portal-btn portal-btn-outline portal-btn-sm">
              Main Journal ↗
            </a>
          </div>
        </header>

        <div className="portal-content portal-reveal">{children}</div>
      </div>
    </div>
  );
}
