'use client';

import StatusBadge from './StatusBadge';
import DeadlineCountdown from './DeadlineCountdown';

export default function PaperCard({ paper, role, onClick, recommendation }) {
  const issueLabel = paper.targetIssue
    ? paper.targetIssue.title ||
      `Vol ${paper.targetIssue.volume} Issue ${paper.targetIssue.issue}`
    : 'Unassigned Issue';

  const abstractPreview =
    paper.abstract && paper.abstract.length > 170
      ? `${paper.abstract.slice(0, 170)}...`
      : paper.abstract;

  return (
    <div
      className={`portal-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#4f46e5',
              background: '#eef2ff',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
            }}
          >
            {paper.paperId}
          </span>
          <span className="portal-tag">{issueLabel}</span>
          {paper.currentVersion > 1 && (
            <span className="portal-tag">v{paper.currentVersion}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {paper.reviewStats?.nearestDeadline &&
            ['submitted', 'under_review', 'revised'].includes(paper.status) && (
              <DeadlineCountdown deadline={paper.reviewStats.nearestDeadline} label="Review due" />
            )}
          <StatusBadge status={paper.status} />
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          {paper.title}
        </h3>
        {abstractPreview && (
          <p style={{ fontSize: '0.87rem', color: '#475569', lineHeight: 1.5 }}>
            {abstractPreview}
          </p>
        )}
      </div>

      {paper.keywords?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {paper.keywords.slice(0, 6).map((kw, i) => (
            <span key={i} className="portal-tag">
              #{kw}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.65rem',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.8rem',
          color: '#64748b',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <span>
          Submitted {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : '—'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {role !== 'submitter' && paper.reviewStats && (
            <span>
              Reviews: <strong>{paper.reviewStats.completed}/{paper.reviewStats.total}</strong>
            </span>
          )}
          {recommendation && (
            <span style={{ fontWeight: 700, color: '#059669' }}>
              Recommendation: {recommendation.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
