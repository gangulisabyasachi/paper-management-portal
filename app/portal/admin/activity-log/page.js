'use client';

import { useEffect, useState } from 'react';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';

function getActionStyle(action) {
  if (action.includes('CREATED') || action.includes('SUBMITTED') || action.includes('COMPLETED') || action.includes('ACCEPTED')) {
    return { background: '#d1fae5', color: '#047857' };
  }
  if (action.includes('DELETED') || action.includes('DECLINED') || action.includes('FAILED') || action.includes('LOCKED')) {
    return { background: '#fee2e2', color: '#b91c1c' };
  }
  if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('ASSIGNED') || action.includes('DECISION')) {
    return { background: '#eef2ff', color: '#4338ca' };
  }
  return { background: '#fef3c7', color: '#b45309' };
}

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '25',
          action: actionFilter,
        });
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);

        const res = await fetch(`/api/portal/admin/activity-log?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, actionFilter, fromDate, toDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">Portal Audit Trail & Activity Log</h1>
          <p className="portal-page-subtitle">
            Complete accountability log of submissions, assignments, reviews, decisions, and logins ({pagination.total} events).
          </p>
        </div>
      </div>

      <div className="portal-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '210px' }}>
            <label className="portal-label">Action Type</label>
            <select
              className="portal-select"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Actions</option>
              <option value="PAPER_SUBMITTED">Paper Submitted</option>
              <option value="REVISION_UPLOADED">Revision Uploaded</option>
              <option value="REVIEWER_AUTO_ASSIGNED">Auto-Assigned Reviewer</option>
              <option value="REVIEWERS_ASSIGNED">Manual Reviewer Assigned</option>
              <option value="REVIEW_COMPLETED">Review Completed</option>
              <option value="DECISION_MADE">Editorial Decision Made</option>
              <option value="ISSUE_CREATED">Issue Created</option>
              <option value="USER_CREATED">User Created</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILED">Login Failed</option>
            </select>
          </div>

          <div>
            <label className="portal-label">From Date</label>
            <input
              type="date"
              className="portal-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="portal-label">To Date</label>
            <input
              type="date"
              className="portal-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="portal-skeleton" style={{ height: '260px' }} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs found" description="Try clearing the date or action filters." />
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{log.user?.name || 'System'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {log.user?.email || ''} {log.user?.role ? `(${log.user.role})` : ''}
                    </div>
                  </td>
                  <td>
                    <span className="portal-badge" style={getActionStyle(log.action)}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {log.targetModel || '—'}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#334155', maxWidth: '380px' }}>
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

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
