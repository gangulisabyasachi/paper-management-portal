'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import StatusBadge from '../../../components/StatusBadge';
import StatusTracker from '../../../components/StatusTracker';
import DeadlineCountdown from '../../../components/DeadlineCountdown';
import DiscussionThread from '../../../components/DiscussionThread';
import Modal from '../../../components/Modal';

export default function EditorPaperDetailPage({ params }) {
  const { id } = use(params);
  const [paper, setPaper] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [discussion, setDiscussion] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [allReviewers, setAllReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Assign reviewer modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Decision form
  const [decision, setDecision] = useState('accepted');
  const [decisionLetter, setDecisionLetter] = useState('');
  const [deciding, setDeciding] = useState(false);

  const loadData = async () => {
    try {
      const [pRes, sessRes, revUsersRes] = await Promise.all([
        fetch(`/api/portal/papers/${id}`, { cache: 'no-store' }),
        fetch('/api/portal/auth/session', { cache: 'no-store' }),
        fetch('/api/portal/admin/users?role=reviewer&status=active', { cache: 'no-store' }),
      ]);
      const [pData, sessData, revUsersData] = await Promise.all([
        pRes.json(),
        sessRes.json(),
        revUsersRes.json(),
      ]);

      if (!pRes.ok) {
        setError(pData.error || 'Unable to load paper.');
      } else {
        setPaper(pData.paper);
        setReviews(pData.reviews || []);
        setDiscussion(pData.discussion);
        setCurrentUser(sessData.user);
        setAllReviewers(revUsersData.users || []);
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
    setMsg('');
    setError('');
    setAssigning(true);
    try {
      const res = await fetch(`/api/portal/admin/papers/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAssign: true, count: 2 }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Auto-assign failed.');
      else {
        setMsg(data.message || 'Auto-assignment completed.');
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
        setMsg('Reviewer(s) assigned successfully.');
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
        setMsg(`Editorial decision (${decision.replace(/_/g, ' ')}) recorded and shared with the author.`);
        await loadData();
      }
    } finally {
      setDeciding(false);
    }
  };

  if (loading) return <div className="portal-skeleton" style={{ height: '300px' }} />;
  if (error && !paper) return <div className="portal-alert error"><span>{error}</span></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/portal/editor" className="portal-btn portal-btn-outline portal-btn-sm">
          ← Back to Editor Desk
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

        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
          {paper.title}
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
          {paper.abstract}
        </p>

        {paper.keywords?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '1rem' }}>
            {paper.keywords.map((kw, i) => (
              <span key={i} className="portal-tag">#{kw}</span>
            ))}
          </div>
        )}

        {(paper.authors || []).length > 0 && (
          <div style={{ marginTop: '1.15rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: '#475569' }}>
            <strong>Authors:</strong>
            {paper.authors.map((a, idx) => (
              <div key={idx} style={{ padding: '0.45rem 0.65rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>{a.name}</strong> {idx === 0 && <span className="portal-tag">Main Author</span>}
                {a.academicDesignation ? ` — ${a.academicDesignation}` : ''}
                {a.affiliation ? ` • ${a.affiliation}` : ''}
                {a.email ? ` • ${a.email}` : ''}
                {a.phone ? ` • ${a.phone}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      <StatusTracker currentStatus={paper.status} />

      {/* Reviewer Assignment Section */}
      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Assigned Reviewers & Evaluations</h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
              {reviews.length} reviewer(s) assigned • {reviews.filter((r) => r.status === 'completed').length} completed
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="portal-btn portal-btn-outline portal-btn-sm"
              onClick={handleAutoAssign}
              disabled={assigning}
            >
              ⚡ Auto-Assign Reviewers
            </button>
            <button
              type="button"
              className="portal-btn portal-btn-primary portal-btn-sm"
              onClick={() => setAssignOpen(true)}
            >
              + Assign Manually
            </button>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="portal-alert warning">
            <span>No reviewers assigned yet. Click Auto-Assign or Assign Manually above.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div key={rev._id} style={{ padding: '1.15rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>
                      {rev.reviewer?.name || 'Reviewer'}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      ({rev.reviewer?.affiliation || rev.reviewer?.email})
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                    {rev.scores && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {['originality', 'methodology', 'clarity', 'significance', 'overall'].map((k) => (
                          <span key={k} className="portal-tag" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                            <strong style={{ textTransform: 'capitalize', marginRight: '0.3rem' }}>{k}:</strong>
                            {rev.scores[k]}/10
                          </span>
                        ))}
                        {rev.recommendation && (
                          <span className="portal-tag" style={{ background: '#eef2ff', color: '#4338ca', textTransform: 'capitalize' }}>
                            Rec: {rev.recommendation.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                      <strong>Comments to Author:</strong> {rev.commentsToAuthor}
                    </div>
                    {rev.confidentialComments && (
                      <div style={{ fontSize: '0.86rem', color: '#92400e', background: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #fde68a', whiteSpace: 'pre-wrap' }}>
                        <strong>Confidential to Editor:</strong> {rev.confidentialComments}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editorial Decision Form */}
      <form onSubmit={handleDecision} className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Editorial Decision</h2>
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
          <label className="portal-label">Decision Letter (visible in Submitter Portal)</label>
          <textarea
            className="portal-textarea"
            rows={4}
            placeholder="Write the official editorial decision letter to the author..."
            value={decisionLetter}
            onChange={(e) => setDecisionLetter(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="portal-btn portal-btn-primary" disabled={deciding}>
            {deciding ? 'Recording Decision...' : 'Record & Publish Decision'}
          </button>
        </div>
      </form>

      {/* Version History */}
      <div className="portal-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Manuscript Version History</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          {(paper.files || []).map((f) => (
            <a
              key={f.version}
              href={`/api/portal/papers/${paper._id}/download?version=${f.version}`}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-btn portal-btn-outline portal-btn-sm"
            >
              Version {f.version} ({f.originalName})
            </a>
          ))}
        </div>
      </div>

      {/* Discussion Thread */}
      <DiscussionThread
        paperId={paper._id}
        initialMessages={discussion?.messages || []}
        currentUser={currentUser}
      />

      {/* Manual Reviewer Assignment Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Reviewers Manually">
        <form onSubmit={handleManualAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="portal-label">Select Reviewers</label>
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {allReviewers.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '0.5rem' }}>No active reviewers found.</p>
              ) : (
                allReviewers.map((r) => {
                  const checked = selectedReviewerIds.includes(r._id);
                  return (
                    <label
                      key={r._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        background: checked ? '#eef2ff' : '#f8fafc',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReviewerIds((prev) => [...prev, r._id]);
                            } else {
                              setSelectedReviewerIds((prev) => prev.filter((x) => x !== r._id));
                            }
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
                })
              )}
            </div>
          </div>

          <div>
            <label className="portal-label">Review Deadline (defaults to 14 days)</label>
            <input
              type="date"
              className="portal-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" onClick={() => setAssignOpen(false)} className="portal-btn portal-btn-outline">
              Cancel
            </button>
            <button type="submit" className="portal-btn portal-btn-primary" disabled={assigning || selectedReviewerIds.length === 0}>
              {assigning ? 'Assigning...' : 'Assign Selected'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
