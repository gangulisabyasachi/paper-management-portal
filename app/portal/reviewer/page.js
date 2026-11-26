'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import StatusBadge from '../components/StatusBadge';
import DeadlineCountdown from '../components/DeadlineCountdown';
import EmptyState from '../components/EmptyState';

export default function ReviewerDashboardPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'history' ? 'completed' : 'active';

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [respondingId, setRespondingId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadReviews = async () => {
    try {
      const res = await fetch('/api/portal/reviews', { cache: 'no-store' });
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    if (searchParams.get('tab') === 'history') {
      setTab('completed');
    } else {
      setTab('active');
    }
  }, [searchParams]);

  const handleRespond = async (reviewId, response) => {
    setRespondingId(reviewId);
    setNotice('');
    try {
      const res = await fetch(`/api/portal/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(
          response === 'accepted'
            ? 'Assignment accepted. You may now proceed to review the manuscript.'
            : 'Assignment declined. The system has been notified to assign an alternate reviewer.'
        );
        await loadReviews();
      } else {
        setNotice(data.error || 'Action failed.');
      }
    } finally {
      setRespondingId(null);
    }
  };

  const stats = useMemo(() => {
    const pending = reviews.filter((r) => r.status === 'pending').length;
    const inProgress = reviews.filter((r) =>
      ['accepted', 'in_progress'].includes(r.status)
    ).length;
    const completed = reviews.filter((r) => r.status === 'completed').length;
    return { pending, inProgress, completed };
  }, [reviews]);

  const activeList = useMemo(
    () =>
      reviews.filter((r) =>
        ['pending', 'accepted', 'in_progress'].includes(r.status)
      ),
    [reviews]
  );

  const completedList = useMemo(
    () => reviews.filter((r) => ['completed', 'declined'].includes(r.status)),
    [reviews]
  );

  const shownList = tab === 'active' ? activeList : completedList;

  return (
    <div>
      <div className="portal-page-header">
        <div>
          <h1 className="portal-page-title">Peer Reviewer Workspace</h1>
          <p className="portal-page-subtitle">
            Evaluate assigned manuscripts, track review deadlines, and collaborate with editors.
          </p>
        </div>
      </div>

      {notice && (
        <div className="portal-alert info" style={{ marginBottom: '1.25rem' }}>
          <span>{notice}</span>
        </div>
      )}

      <div className="portal-dashboard-grid">
        <div className="portal-stat-card amber">
          <span className="portal-stat-title">Awaiting Response</span>
          <span className="portal-stat-value">{stats.pending}</span>
          <span className="portal-stat-sub">New assignments</span>
        </div>
        <div className="portal-stat-card indigo">
          <span className="portal-stat-title">In Progress</span>
          <span className="portal-stat-value">{stats.inProgress}</span>
          <span className="portal-stat-sub">Accepted & pending submission</span>
        </div>
        <div className="portal-stat-card green">
          <span className="portal-stat-title">Completed Reviews</span>
          <span className="portal-stat-value">{stats.completed}</span>
          <span className="portal-stat-sub">Submitted evaluations</span>
        </div>
      </div>

      <div className="portal-tabs">
        <button
          type="button"
          className={`portal-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active Assignments ({activeList.length})
        </button>
        <button
          type="button"
          className={`portal-tab ${tab === 'completed' ? 'active' : ''}`}
          onClick={() => setTab('completed')}
        >
          Review History ({completedList.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2].map((i) => (
            <div key={i} className="portal-skeleton" style={{ height: '140px' }} />
          ))}
        </div>
      ) : shownList.length === 0 ? (
        <EmptyState
          title={
            tab === 'active'
              ? 'No active review assignments'
              : 'No completed reviews yet'
          }
          description={
            tab === 'active'
              ? 'When manuscripts matching your expertise are assigned to you, they will appear here.'
              : 'Your completed and past peer reviews will be archived here.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {shownList.map((rev) => {
            const p = rev.paper;
            if (!p) return null;
            const issueTitle = p.targetIssue
              ? p.targetIssue.title ||
                `Vol ${p.targetIssue.volume} Issue ${p.targetIssue.issue}`
              : '';

            return (
              <div
                key={rev._id}
                className="portal-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                      {p.paperId}
                    </span>
                    {issueTitle && <span className="portal-tag">{issueTitle}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {rev.deadline && rev.status !== 'completed' && rev.status !== 'declined' && (
                      <DeadlineCountdown deadline={rev.deadline} />
                    )}
                    <StatusBadge status={rev.status} />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    {p.title}
                  </h3>
                  {p.abstract && (
                    <p style={{ fontSize: '0.87rem', color: '#475569' }}>
                      {p.abstract.length > 180 ? `${p.abstract.slice(0, 180)}...` : p.abstract}
                    </p>
                  )}
                </div>

                {p.keywords?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {p.keywords.map((kw, i) => (
                      <span key={i} className="portal-tag">#{kw}</span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #f1f5f9',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Assigned {rev.assignedAt ? new Date(rev.assignedAt).toLocaleDateString() : '—'}
                    {rev.completedAt ? ` • Completed ${new Date(rev.completedAt).toLocaleDateString()}` : ''}
                  </span>

                  <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                    {rev.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="portal-btn portal-btn-success portal-btn-sm"
                          disabled={respondingId === rev._id}
                          onClick={() => handleRespond(rev._id, 'accepted')}
                        >
                          Accept Assignment
                        </button>
                        <button
                          type="button"
                          className="portal-btn portal-btn-outline portal-btn-sm"
                          disabled={respondingId === rev._id}
                          onClick={() => handleRespond(rev._id, 'declined')}
                          style={{ color: '#dc2626' }}
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {['accepted', 'in_progress'].includes(rev.status) && (
                      <Link
                        href={`/portal/reviewer/review/${rev._id}`}
                        className="portal-btn portal-btn-primary portal-btn-sm"
                      >
                        Start / Continue Review →
                      </Link>
                    )}

                    {rev.status === 'completed' && (
                      <Link
                        href={`/portal/reviewer/review/${rev._id}`}
                        className="portal-btn portal-btn-outline portal-btn-sm"
                      >
                        View Submitted Review
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
