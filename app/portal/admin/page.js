'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AnalyticsCards from '../components/AnalyticsCards';

const STATUS_BARS = [
  { key: 'submitted', label: 'Submitted', color: '#0284c7' },
  { key: 'under_review', label: 'Under Review', color: '#4f46e5' },
  { key: 'revisions_requested', label: 'Revisions Requested', color: '#d97706' },
  { key: 'revised', label: 'Revised', color: '#0891b2' },
  { key: 'accepted', label: 'Accepted', color: '#059669' },
  { key: 'rejected', label: 'Rejected', color: '#dc2626' },
];

export default function PortalAdminDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/portal/admin/analytics', { cache: 'no-store' });
        const data = await res.json();
        setAnalytics(data.analytics || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = analytics?.totalPapers || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">Master Admin Control Center</h1>
          <p className="portal-page-subtitle">
            Executive overview of WISDOM Journal submissions, peer reviews, issues, and audit logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link href="/portal/admin/issues" className="portal-btn portal-btn-outline portal-btn-sm">
            + Create Issue
          </Link>
          <Link href="/portal/admin/reviewers" className="portal-btn portal-btn-outline portal-btn-sm">
            + Add Reviewer
          </Link>
          <Link href="/portal/admin/submissions" className="portal-btn portal-btn-primary portal-btn-sm">
            View All Papers
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="portal-skeleton" style={{ height: '160px' }} />
      ) : (
        <AnalyticsCards analytics={analytics} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Submissions Pipeline Breakdown */}
        <div className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Submissions by Status</h2>
            <span className="portal-tag">Total: {analytics?.totalPapers ?? 0}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {STATUS_BARS.map((bar) => {
              const count = analytics?.statusCounts?.[bar.key] ?? 0;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={bar.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{bar.label}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{count}</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${analytics?.totalPapers ? pct : 0}%`,
                        height: '100%',
                        background: bar.color,
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviewer Workload */}
        <div className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Reviewer Workload</h2>
            <Link href="/portal/admin/reviewers" style={{ fontSize: '0.82rem', color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
              Manage All →
            </Link>
          </div>
          {!analytics?.reviewerWorkload?.length ? (
            <p style={{ fontSize: '0.86rem', color: '#94a3b8' }}>No reviewer assignments recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {analytics.reviewerWorkload.map((rw) => (
                <div
                  key={rw._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rw.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{rw.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <span className="portal-badge in-progress">{rw.active} active</span>
                    <span className="portal-badge completed">{rw.completed} done</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Portal Activity</h2>
          <Link href="/portal/admin/activity-log" className="portal-btn portal-btn-outline portal-btn-sm">
            Full Audit Log →
          </Link>
        </div>
        {!analytics?.recentActivity?.length ? (
          <p style={{ fontSize: '0.86rem', color: '#94a3b8' }}>No activity recorded yet.</p>
        ) : (
          <div className="portal-table-container">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentActivity.slice(0, 10).map((log) => (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.user?.name || 'System'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{log.user?.role || ''}</div>
                    </td>
                    <td>
                      <span className="portal-tag">{log.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {typeof log.details === 'string'
                        ? log.details
                        : log.details
                          ? Object.entries(log.details)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' • ')
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
