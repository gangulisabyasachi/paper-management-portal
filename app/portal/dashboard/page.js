'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PaperCard from '../components/PaperCard';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

export default function SubmitterDashboardPage() {
  const router = useRouter();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchPapers() {
      try {
        const res = await fetch('/api/portal/papers', { cache: 'no-store' });
        const data = await res.json();
        setPapers(data.papers || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPapers();
  }, []);

  const stats = useMemo(() => {
    const total = papers.length;
    const underReview = papers.filter((p) =>
      ['submitted', 'under_review', 'revised'].includes(p.status)
    ).length;
    const revisions = papers.filter((p) => p.status === 'revisions_requested').length;
    const accepted = papers.filter((p) => p.status === 'accepted').length;
    const rejected = papers.filter((p) => p.status === 'rejected').length;
    return { total, underReview, revisions, accepted, rejected };
  }, [papers]);

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = p.paperId?.toLowerCase().includes(q);
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchKw = (p.keywords || []).some((k) => k.toLowerCase().includes(q));
        return matchId || matchTitle || matchKw;
      }
      return true;
    });
  }, [papers, statusFilter, search]);

  return (
    <div>
      <div className="portal-page-header">
        <div>
          <h1 className="portal-page-title">Author Submission Dashboard</h1>
          <p className="portal-page-subtitle">
            Track your manuscripts, view peer review feedback, and upload revisions.
          </p>
        </div>
        <Link href="/portal/dashboard/submit" className="portal-btn portal-btn-primary">
          + Submit New Paper
        </Link>
      </div>

      <div className="portal-dashboard-grid">
        <div className="portal-stat-card indigo">
          <span className="portal-stat-title">Total Submissions</span>
          <span className="portal-stat-value">{stats.total}</span>
          <span className="portal-stat-sub">All manuscripts submitted</span>
        </div>
        <div className="portal-stat-card amber">
          <span className="portal-stat-title">In Review Pipeline</span>
          <span className="portal-stat-value">{stats.underReview}</span>
          <span className="portal-stat-sub">{stats.revisions} awaiting revision</span>
        </div>
        <div className="portal-stat-card green">
          <span className="portal-stat-title">Accepted</span>
          <span className="portal-stat-value">{stats.accepted}</span>
          <span className="portal-stat-sub">Approved for publication</span>
        </div>
        <div className="portal-stat-card red">
          <span className="portal-stat-title">Rejected</span>
          <span className="portal-stat-value">{stats.rejected}</span>
          <span className="portal-stat-sub">Closed submissions</span>
        </div>
      </div>

      <div className="portal-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
          <SearchBar
            placeholder="Search by Paper ID (e.g. WISDOM-2026-0001), title, or keyword..."
            value={search}
            onSearch={setSearch}
          />
          <select
            className="portal-select"
            style={{ width: 'auto', minWidth: '190px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="revisions_requested">Revisions Requested</option>
            <option value="revised">Revised</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="portal-skeleton" style={{ height: '130px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={papers.length === 0 ? 'No manuscripts submitted yet' : 'No matching submissions'}
          description={
            papers.length === 0
              ? 'Select an open WISDOM Journal issue and submit your research paper to begin peer review.'
              : 'Try adjusting your search query or status filter.'
          }
          action={
            papers.length === 0
              ? { label: 'Submit Your First Paper', onClick: () => router.push('/portal/dashboard/submit') }
              : undefined
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((paper) => (
            <PaperCard
              key={paper._id}
              paper={paper}
              role="submitter"
              onClick={() => router.push(`/portal/dashboard/paper/${paper._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
