'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import StatusBadge from '../../../components/StatusBadge';
import DeadlineCountdown from '../../../components/DeadlineCountdown';
import ReviewForm from '../../../components/ReviewForm';
import DiscussionThread from '../../../components/DiscussionThread';

export default function ReviewerPaperReviewPage({ params }) {
  const { id } = use(params);
  const [review, setReview] = useState(null);
  const [discussion, setDiscussion] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [revRes, sessRes] = await Promise.all([
        fetch(`/api/portal/reviews/${id}`, { cache: 'no-store' }),
        fetch('/api/portal/auth/session', { cache: 'no-store' }),
      ]);
      const revData = await revRes.json();
      const sessData = await sessRes.json();

      if (!revRes.ok) {
        setError(revData.error || 'Unable to load review.');
      } else {
        setReview(revData.review);
        setDiscussion(revData.discussion);
        setCurrentUser(sessData.user);
      }
    } catch {
      setError('Network error loading review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="portal-skeleton" style={{ height: '300px' }} />;
  }

  if (error || !review || !review.paper) {
    return (
      <div className="portal-alert error">
        <span>{error || 'Review assignment not found.'}</span>
      </div>
    );
  }

  const paper = review.paper;
  const issueLabel = paper.targetIssue
    ? paper.targetIssue.title ||
      `Vol ${paper.targetIssue.volume} Issue ${paper.targetIssue.issue}`
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/portal/reviewer" className="portal-btn portal-btn-outline portal-btn-sm">
          ← Back to Assignments
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {review.deadline && review.status !== 'completed' && (
            <DeadlineCountdown deadline={review.deadline} />
          )}
          <a
            href={`/api/portal/papers/${paper._id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-btn portal-btn-primary portal-btn-sm"
          >
            Download Manuscript (v{paper.currentVersion})
          </a>
        </div>
      </div>

      {/* Paper Metadata Card */}
      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
              {paper.paperId}
            </span>
            <span className="portal-tag">{issueLabel}</span>
          </div>
          <StatusBadge status={review.status} />
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

        {paper.files?.length > 1 && (
          <div style={{ marginTop: '1.15rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <div className="portal-label">Manuscript Version History</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {paper.files.map((f) => (
                <a
                  key={f.version}
                  href={`/api/portal/papers/${paper._id}/download?version=${f.version}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portal-btn portal-btn-outline portal-btn-sm"
                >
                  Version {f.version}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Form or Submitted Summary */}
      <ReviewForm
        reviewId={review._id}
        existingReview={review}
        onSubmitted={() => loadData()}
      />

      {/* Confidential Discussion Thread */}
      <DiscussionThread
        paperId={paper._id}
        initialMessages={discussion?.messages || []}
        currentUser={currentUser}
      />
    </div>
  );
}
