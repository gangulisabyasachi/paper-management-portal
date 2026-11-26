'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '../../../components/StatusBadge';
import StatusTracker from '../../../components/StatusTracker';
import DeadlineCountdown from '../../../components/DeadlineCountdown';
import DiscussionThread from '../../../components/DiscussionThread';
import Modal from '../../../components/Modal';

export default function AdminPaperDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [paper, setPaper] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [discussion, setDiscussion] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [allReviewers, setAllReviewers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [decision, setDecision] = useState('accepted');
  const [decisionLetter, setDecisionLetter] = useState('');
  const [deciding, setDeciding] = useState(false);

  const loadData = async () => {
    try {
      const [pRes, sessRes, revRes] = await Promise.all([
        fetch(`/api/portal/papers/${id}`, { cache: 'no-store' }),
        fetch('/api/portal/auth/session', { cache: 'no-store' }),
        fetch('/api/portal/admin/users?role=reviewer&status=active', { cache: 'no-store' }),
      ]);
      const [pData, sessData, revData] = await Promise.all([
        pRes.json(),
        sessRes.json(),
        revRes.json(),
      ]);

      if (!pRes.ok) {
        setError(pData.error || 'Unable to load paper.');
      } else {
        setPaper(pData.paper);
        setReviews(pData.reviews || []);
        setDiscussion(pData.discussion);
        setActivityLogs(pData.activityLogs || []);
        setCurrentUser(sessData.user);
        setAllReviewers(revData.users || []);
        if (pData.paper?.decisionLetter) {
          setDecisionLetter(pData.paper.decisionLetter);
        }
      }
    } catch {
      setError('Network error loading paper.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAutoAssign = async () => {
    setAssigning(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/portal/admin/papers/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAssign: true, count: 2 }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Auto-assign failed.');
      else {
        setMsg(data.message || 'Auto-assigned reviewers.');
        await loadData();
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleManualAssign = async (e) => {
    e.preventDefault();
    if (selectedReviewerIds.length === 0) return;
    setAssigning(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/portal/admin/papers/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerIds: selectedReviewerIds,
          deadline: deadline || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Assignment failed.');
      else {
        setAssignOpen(false);
        setSelectedReviewerIds([]);
        setMsg('Reviewer(s) assigned.');
        await loadData();
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleDecision = async (e) => {
    e.preventDefault();
    setDeciding(true);
    setError('');
    setMsg('');
    try {
      const res = await fetch(`/api/portal/admin/papers/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decisionLetter }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Decision failed.');
      else {
        setMsg(`Final decision (${decision.replace(/_/g, ' ')}) saved and published to Submitter Portal.`);
        await loadData();
      }
    } finally {
      setDeciding(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Mark this paper as withdrawn?')) return;
    const res = await fetch(`/api/portal/papers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'withdrawn' }),
    });
    if (res.ok) {
      setMsg('Paper marked as withdrawn.');
      await loadData();
    }
  };

  const handleDelete = async () => {
    if (!confirm('PERMANENTLY delete this paper and all its reviews/discussions?')) return;
    const res = await fetch(`/api/portal/papers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.replace('/portal/admin/submissions');
    }
  };

  if (loading) return <div className="portal-skeleton" style={{ height: '300px' }} />;
  if (error && !paper) return <div className="portal-alert error"><span>{error}</span></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/portal/admin/submissions" className="portal-btn portal-btn-outline portal-btn-sm">
          ← Back to All Submissions
        </Link>
        <a
          href={`/api/portal/papers/${paper._id}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-btn portal-btn-primary portal-btn-sm"
        >
          Download Latest PDF (v{paper.currentVersion})
        </a>
      </div>

      {msg && <div className="portal-alert success"><span>{msg}</span></div>}
      {error && <div className="portal-alert error"><span>{error}</span></div>}

      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
              {paper.paperId}
            </span>
            <span className="portal-tag">
              {paper.targetIssue?.title || `Vol ${paper.targetIssue?.volume} Issue ${paper.targetIssue?.issue}`}
            </span>
          </div>
          <StatusBadge status={paper.status} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
          {paper.title}
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
          {paper.abstract}
        </p>

        <div style={{ marginTop: '1.15rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#475569' }}>
          <div>
            <strong>Submitting Account:</strong> {paper.submittedBy?.name} ({paper.submittedBy?.email})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <strong>Authors:</strong>
            {(paper.authors || []).map((a, idx) => (
              <div key={idx} style={{ padding: '0.45rem 0.65rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>{a.name}</strong> {idx === 0 && <span className="portal-tag">Main Author</span>}
                {a.academicDesignation ? ` — ${a.academicDesignation}` : ''}
                {a.affiliation ? ` • ${a.affiliation}` : ''}
                {a.email ? ` • ${a.email}` : ''}
                {a.phone ? ` • ${a.phone}` : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      <StatusTracker currentStatus={paper.status} />

      {/* Reviewers & Reviews */}
      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Peer Reviewers & Reports</h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
              {reviews.length} assigned • {reviews.filter((r) => r.status === 'completed').length} completed
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.55rem' }}>
            <button type="button" className="portal-btn portal-btn-outline portal-btn-sm" onClick={handleAutoAssign} disabled={assigning}>
              ⚡ Auto-Assign
            </button>
            <button type="button" className="portal-btn portal-btn-primary portal-btn-sm" onClick={() => setAssignOpen(true)}>
              + Assign Manually
            </button>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="portal-alert warning">
            <span>No reviewers assigned yet.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div key={rev._id} style={{ padding: '1.1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{rev.reviewer?.name || 'Reviewer'}</span>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      ({rev.reviewer?.email} • {rev.reviewer?.affiliation || 'No affiliation'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {rev.deadline && rev.status !== 'completed' && rev.status !== 'declined' && (
                      <DeadlineCountdown deadline={rev.deadline} />
                    )}
                    <StatusBadge status={rev.status} />
                  </div>
                </div>

                {rev.status === 'completed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '0.75rem' }}>
                    {rev.scores && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                        {['originality', 'methodology', 'clarity', 'significance', 'overall'].map((k) => (
                          <span key={k} className="portal-tag" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                            <strong style={{ textTransform: 'capitalize', marginRight: '0.25rem' }}>{k}:</strong>
                            {rev.scores[k]}/10
                          </span>
                        ))}
                        {rev.recommendation && (
                          <span className="portal-tag" style={{ background: '#eef2ff', color: '#4338ca', textTransform: 'capitalize' }}>
                            {rev.recommendation.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                      <strong>To Author:</strong> {rev.commentsToAuthor}
                    </p>
                    {rev.confidentialComments && (
                      <p style={{ fontSize: '0.86rem', color: '#92400e', background: '#fffbeb', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #fde68a', whiteSpace: 'pre-wrap' }}>
                        <strong>Confidential:</strong> {rev.confidentialComments}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Decision */}
      <form onSubmit={handleDecision} className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Master Decision Controls</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
          {[
            { val: 'accepted', label: 'Accept Manuscript', color: '#059669' },
            { val: 'revisions_requested', label: 'Request Revisions', color: '#d97706' },
            { val: 'rejected', label: 'Reject Manuscript', color: '#dc2626' },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setDecision(opt.val)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: decision === opt.val ? `2px solid ${opt.color}` : '1px solid #cbd5e1',
                background: decision === opt.val ? '#f8fafc' : '#fff',
                color: decision === opt.val ? opt.color : '#334155',
                fontWeight: decision === opt.val ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div>
          <label className="portal-label">Official Decision Letter (sent to Submitter Portal)</label>
          <textarea
            className="portal-textarea"
            rows={4}
            value={decisionLetter}
            onChange={(e) => setDecisionLetter(e.target.value)}
            placeholder="Write editorial decision comments for the author..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="portal-btn portal-btn-primary" disabled={deciding}>
            {deciding ? 'Publishing...' : 'Publish Final Decision'}
          </button>
        </div>
      </form>

      {/* Version History & Paper Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div className="portal-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Manuscript Version History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {(paper.files || []).slice().reverse().map((f) => (
              <div key={f.version} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>Version {f.version}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{f.originalName}</div>
                </div>
                <a href={`/api/portal/papers/${paper._id}/download?version=${f.version}`} target="_blank" rel="noopener noreferrer" className="portal-btn portal-btn-outline portal-btn-sm">
                  View PDF
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Paper Audit Trail</h3>
          {activityLogs.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No audit entries for this paper.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
              {activityLogs.map((log) => (
                <div key={log._id} style={{ padding: '0.55rem 0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{log.action.replace(/_/g, ' ')}</strong>
                    <span style={{ color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ color: '#64748b' }}>By: {log.user?.name || 'System'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Discussion Thread */}
      <DiscussionThread
        paperId={paper._id}
        initialMessages={discussion?.messages || []}
        currentUser={currentUser}
      />

      {/* Danger Zone */}
      <div className="portal-card" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.35rem' }}>
          Administrative Danger Zone
        </h3>
        <p style={{ fontSize: '0.84rem', color: '#7f1d1d', marginBottom: '1rem' }}>
          Withdraw or permanently delete this manuscript submission from the database.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="portal-btn portal-btn-outline portal-btn-sm" onClick={handleWithdraw}>
            Mark Withdrawn
          </button>
          <button type="button" className="portal-btn portal-btn-danger portal-btn-sm" onClick={handleDelete}>
            Delete Permanently
          </button>
        </div>
      </div>

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Reviewers Manually">
        <form onSubmit={handleManualAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {allReviewers.map((r) => {
              const checked = selectedReviewerIds.includes(r._id);
              return (
                <label key={r._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', padding: '0.55rem', borderRadius: '8px', background: checked ? '#eef2ff' : '#f8fafc', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedReviewerIds((p) => [...p, r._id]);
                        else setSelectedReviewerIds((p) => p.filter((x) => x !== r._id));
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        {r.affiliation || r.email} {(r.expertise || []).length > 0 ? `• ${r.expertise.join(', ')}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="portal-tag">Active: {r.activeReviews || 0}</span>
                </label>
              );
            })}
          </div>
          <div>
            <label className="portal-label">Review Deadline (optional)</label>
            <input type="date" className="portal-input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" className="portal-btn portal-btn-outline" onClick={() => setAssignOpen(false)}>Cancel</button>
            <button type="submit" className="portal-btn portal-btn-primary" disabled={assigning || selectedReviewerIds.length === 0}>
              {assigning ? 'Assigning...' : 'Assign Selected'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
