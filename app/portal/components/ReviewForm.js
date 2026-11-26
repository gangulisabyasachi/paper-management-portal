'use client';

import { useState } from 'react';

const CRITERIA = [
  { key: 'originality', label: 'Originality & Novelty' },
  { key: 'methodology', label: 'Methodology & Rigor' },
  { key: 'clarity', label: 'Clarity & Presentation' },
  { key: 'significance', label: 'Scholarly Significance' },
  { key: 'overall', label: 'Overall Assessment' },
];

const RECOMMENDATIONS = [
  { value: 'accept', label: 'Accept', color: '#059669' },
  { value: 'minor_revisions', label: 'Minor Revisions', color: '#0284c7' },
  { value: 'major_revisions', label: 'Major Revisions', color: '#d97706' },
  { value: 'reject', label: 'Reject', color: '#dc2626' },
];

export default function ReviewForm({ reviewId, existingReview, onSubmitted }) {
  const isCompleted = existingReview?.status === 'completed';

  const [scores, setScores] = useState({
    originality: existingReview?.scores?.originality || 7,
    methodology: existingReview?.scores?.methodology || 7,
    clarity: existingReview?.scores?.clarity || 7,
    significance: existingReview?.scores?.significance || 7,
    overall: existingReview?.scores?.overall || 7,
  });
  const [recommendation, setRecommendation] = useState(
    existingReview?.recommendation || ''
  );
  const [commentsToAuthor, setCommentsToAuthor] = useState(
    existingReview?.commentsToAuthor || ''
  );
  const [confidentialComments, setConfidentialComments] = useState(
    existingReview?.confidentialComments || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recommendation) {
      setError('Please select a recommendation.');
      return;
    }
    if (!commentsToAuthor.trim()) {
      setError('Please enter constructive comments for the author.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/reviews/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores,
          recommendation,
          commentsToAuthor: commentsToAuthor.trim(),
          confidentialComments: confidentialComments.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit review.');
      } else {
        setSuccess('Review submitted successfully! Thank you for your contribution.');
        onSubmitted?.(data.review);
      }
    } catch {
      setError('Network error while submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Submitted Peer Review</h3>
          <span className="portal-badge completed">
            Completed {existingReview.completedAt ? new Date(existingReview.completedAt).toLocaleDateString() : ''}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {CRITERIA.map((c) => (
            <div key={c.key} style={{ padding: '0.85rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5', marginTop: '0.2rem' }}>
                {existingReview.scores?.[c.key] ?? '—'} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ 10</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div className="portal-label">Recommendation</div>
          <span className="portal-tag" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', textTransform: 'capitalize' }}>
            {existingReview.recommendation?.replace(/_/g, ' ')}
          </span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div className="portal-label">Comments to Author</div>
          <div style={{ padding: '1rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
            {existingReview.commentsToAuthor}
          </div>
        </div>

        {existingReview.confidentialComments && (
          <div>
            <div className="portal-label">Confidential Comments to Editor</div>
            <div style={{ padding: '1rem', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
              {existingReview.confidentialComments}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Peer Review Evaluation Form</h3>
        <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '0.2rem' }}>
          Score each criterion from 1 (Poor) to 10 (Outstanding) and provide detailed feedback.
        </p>
      </div>

      {error && <div className="portal-alert error"><span>{error}</span></div>}
      {success && <div className="portal-alert success"><span>{success}</span></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        {CRITERIA.map((c) => (
          <div key={c.key} style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="portal-label" style={{ margin: 0 }}>{c.label}</label>
              <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1rem' }}>{scores[c.key]}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={scores[c.key]}
              onChange={(e) => setScores((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: '#4f46e5', cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="portal-label">Editorial Recommendation *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
          {RECOMMENDATIONS.map((rec) => {
            const active = recommendation === rec.value;
            return (
              <button
                key={rec.value}
                type="button"
                onClick={() => setRecommendation(rec.value)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: active ? `2px solid ${rec.color}` : '1px solid #cbd5e1',
                  background: active ? '#f8fafc' : '#ffffff',
                  color: active ? rec.color : '#334155',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  textAlign: 'center',
                }}
              >
                {rec.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="portal-label">Comments to Author (shared in Submitter Portal upon decision) *</label>
        <textarea
          className="portal-textarea"
          rows={5}
          placeholder="Provide constructive, actionable feedback regarding strengths, weaknesses, and suggested improvements..."
          value={commentsToAuthor}
          onChange={(e) => setCommentsToAuthor(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="portal-label">Confidential Comments to Editor / Admin (never shown to author)</label>
        <textarea
          className="portal-textarea"
          rows={3}
          placeholder="Optional confidential notes on ethics, novelty, or borderline concerns..."
          value={confidentialComments}
          onChange={(e) => setConfidentialComments(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="portal-btn portal-btn-primary" disabled={submitting}>
          {submitting ? 'Submitting Review...' : 'Submit Final Review'}
        </button>
      </div>
    </form>
  );
}
