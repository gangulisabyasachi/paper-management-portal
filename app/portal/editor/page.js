'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AnalyticsCards from '../components/AnalyticsCards';
import StatusBadge from '../components/StatusBadge';
import DeadlineCountdown from '../components/DeadlineCountdown';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

const TABS = [
  { key: 'all', label: 'All Papers' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'awaiting_decision', label: 'Awaiting Decision' },
  { key: 'revisions_requested', label: 'Revisions Req.' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

export default function EditorDashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [papers, setPapers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [aRes, pRes, iRes] = await Promise.all([
          fetch('/api/portal/admin/analytics', { cache: 'no-store' }),
          fetch('/api/portal/papers', { cache: 'no-store' }),
          fetch('/api/portal/admin/issues', { cache: 'no-store' }),
        ]);
        const [aData, pData, iData] = await Promise.all([
          aRes.json(),
          pRes.json(),
          iRes.json(),
        ]);
        setAnalytics(aData.analytics || null);
        setPapers(pData.papers || []);
        setIssues(iData.issues || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (tab === 'awaiting_decision') {
        const ready =
          ['under_review', 'revised', 'submitted'].includes(p.status) &&
          p.reviewStats?.total > 0 &&
          p.reviewStats?.completed >= p.reviewStats?.total;
        if (!ready) return false;
      } else if (tab !== 'all' && p.status !== tab) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.paperId?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.submittedBy?.name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [papers, tab, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">Editor-in-Chief Workspace</h1>
          <p className="portal-page-subtitle">
            Manage peer review assignments, evaluate completed reports, and issue editorial decisions.
          </p>
        </div>
      </div>

      <AnalyticsCards analytics={analytics} />

      <div className="portal-card">
        <div className="portal-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`portal-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '1.15rem' }}>
          <SearchBar
            placeholder="Search submissions by Paper ID, title, or author..."
            value={search}
            onSearch={setSearch}
          />
        </div>

        {loading ? (
          <div className="portal-skeleton" style={{ height: '220px' }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No papers in this category"
            description="Adjust your filter tab or search query to inspect other submissions."
          />
        ) : (
          <div className="portal-table-container">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Paper ID</th>
                  <th>Manuscript Title</th>
                  <th>Target Issue</th>
                  <th>Reviews</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => router.push(`/portal/editor/paper/${p._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                        {p.paperId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {p.submittedBy?.name} • {p.submittedBy?.affiliation || '—'}
                      </div>
                    </td>
                    <td>
                      <span className="portal-tag">
                        {p.targetIssue?.title ||
                          `Vol ${p.targetIssue?.volume} Issue ${p.targetIssue?.issue}`}
                      </span>
                    </td>
                    <td>
                      <strong>{p.reviewStats?.completed || 0}</strong> / {p.reviewStats?.total || 0}
                    </td>
                    <td>
                      {p.reviewStats?.nearestDeadline ? (
                        <DeadlineCountdown deadline={p.reviewStats.nearestDeadline} label="Due" />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issues Overview */}
      <div id="issues" className="portal-card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Journal Issues Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {issues.map((iss) => (
            <div key={iss._id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {iss.title || `Vol ${iss.volume} Issue ${iss.issue}`}
                </span>
                <StatusBadge status={iss.status} />
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {iss.paperCount} submission(s)
                {iss.submissionDeadline ? ` • Closes ${new Date(iss.submissionDeadline).toLocaleDateString()}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
