'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import StatusBadge from '../../../components/StatusBadge';
import StatusTracker from '../../../components/StatusTracker';
import FileUpload from '../../../components/FileUpload';

export default function SubmitterPaperDetailPage({ params }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get('submitted') === '1';

  const [paper, setPaper] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revisionFile, setRevisionFile] = useState(null);
  const [uploadingRevision, setUploadingRevision] = useState(false);
  const [revisionMsg, setRevisionMsg] = useState('');

  const loadPaper = async () => {
    try {
      const res = await fetch(`/api/portal/papers/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to load paper.');
      } else {
        setPaper(data.paper);
        setReviews(data.reviews || []);
      }
    } catch {
      setError('Network error loading manuscript.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaper();
  }, [id]);

  const handleRevisionUpload = async (e) => {
    e.preventDefault();
    if (!revisionFile) return;
    setUploadingRevision(true);
    setRevisionMsg('');
    try {
      const fd = new FormData();
      fd.append('file', revisionFile);
      const res = await fetch(`/api/portal/papers/${id}/revisions`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to upload revision.');
      } else {
        setRevisionFile(null);
        setRevisionMsg(`Revision v${data.paper.currentVersion} uploaded successfully!`);
        await loadPaper();
      }
    } catch {
      setError('Network error while uploading revision.');
    } finally {
      setUploadingRevision(false);
    }
  };

  if (loading) {
    return <div className="portal-skeleton" style={{ height: '260px' }} />;
  }

  if (error || !paper) {
    return (
      <div className="portal-alert error">
        <span>{error || 'Paper not found.'}</span>
      </div>
    );
  }

  const issueLabel = paper.targetIssue
    ? paper.targetIssue.title ||
      `WISDOM Journal Vol ${paper.targetIssue.volume} Issue ${paper.targetIssue.issue}`
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link href="/portal/dashboard" className="portal-btn portal-btn-outline portal-btn-sm">
          ← Back to My Submissions
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

      {justSubmitted && (
        <div className="portal-alert success">
          <span>
            Manuscript submitted successfully! Your unique Paper ID is{' '}
            <strong>{paper.paperId}</strong>.
          </span>
        </div>
      )}

      {revisionMsg && (
        <div className="portal-alert success">
          <span>{revisionMsg}</span>
        </div>
      )}

      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '0.28rem 0.7rem', borderRadius: '8px', fontSize: '0.88rem' }}>
              {paper.paperId}
            </span>
            <span className="portal-tag">{issueLabel}</span>
          </div>
          <StatusBadge status={paper.status} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
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
      </div>

      <StatusTracker currentStatus={paper.status} />

      {/* Decision Letter */}
      {paper.decisionLetter && (
        <div className="portal-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Editorial Decision Letter</h2>
            {paper.decisionDate && (
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Issued {new Date(paper.decisionDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.65 }}>
            {paper.decisionLetter}
          </p>
        </div>
      )}

      {/* Upload Revision (only when revisions_requested) */}
      {paper.status === 'revisions_requested' && (
        <form onSubmit={handleRevisionUpload} className="portal-card" style={{ borderLeft: '4px solid #d97706' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Upload Revised Manuscript (v{(paper.currentVersion || 1) + 1})
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
            Revisions were requested by the editorial team. Please upload your updated PDF below.
          </p>
          <FileUpload onFileSelect={setRevisionFile} currentFile={revisionFile} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="portal-btn portal-btn-primary"
              disabled={!revisionFile || uploadingRevision}
            >
              {uploadingRevision ? 'Uploading Revision...' : 'Submit Revised PDF'}
            </button>
          </div>
        </form>
      )}

      {/* Peer Reviews Sent to Submitter Portal */}
      <div className="portal-card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Peer Review Feedback
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '1rem' }}>
          Anonymized reviewer comments and evaluation scores shared upon editorial decision.
        </p>

        {reviews.length === 0 ? (
          <div className="portal-alert info">
            <span>
              Peer review feedback will appear here once reviews are completed and an editorial decision is issued.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div key={rev._id} style={{ padding: '1.15rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    {rev.reviewerLabel || 'Peer Reviewer'}
                  </span>
                  {rev.recommendation && (
                    <span className="portal-tag" style={{ textTransform: 'capitalize' }}>
                      Recommendation: {rev.recommendation.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {rev.scores && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.85rem' }}>
                    {['originality', 'methodology', 'clarity', 'significance', 'overall'].map((k) => (
                      <span key={k} className="portal-tag" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                        <strong style={{ textTransform: 'capitalize', marginRight: '0.3rem' }}>{k}:</strong>
                        {rev.scores[k] ?? '—'}/10
                      </span>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {rev.commentsToAuthor}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Authors & Version History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="portal-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Authors</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(paper.authors || []).map((a, idx) => (
              <div key={idx} style={{ fontSize: '0.88rem', paddingBottom: '0.5rem', borderBottom: idx < (paper.authors?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ fontWeight: 700 }}>
                  {a.name} {idx === 0 && <span className="portal-tag">Main Author</span>}
                </div>
                {a.academicDesignation && (
                  <div style={{ color: '#475569', fontSize: '0.82rem' }}>{a.academicDesignation}</div>
                )}
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  {a.affiliation || '—'} • {a.email || ''} {a.phone ? `• ${a.phone}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Manuscript Version History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(paper.files || []).slice().reverse().map((f) => (
              <div key={f.version} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Version {f.version}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {f.originalName} • {f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : ''}
                  </div>
                </div>
                <a
                  href={`/api/portal/papers/${paper._id}/download?version=${f.version}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portal-btn portal-btn-outline portal-btn-sm"
                >
                  View PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
