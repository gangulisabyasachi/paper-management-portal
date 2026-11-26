'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '../../components/StatusBadge';
import DeadlineCountdown from '../../components/DeadlineCountdown';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const PAGE_SIZE = 15;

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [papers, setPapers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [issueFilter, setIssueFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAuto, setBulkAuto] = useState(true);
  const [bulkReviewerIds, setBulkReviewerIds] = useState([]);
  const [bulkDeadline, setBulkDeadline] = useState('');
  const [processingBulk, setProcessingBulk] = useState(false);
  const [notice, setNotice] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, iRes, rRes] = await Promise.all([
        fetch('/api/portal/papers', { cache: 'no-store' }),
        fetch('/api/portal/admin/issues', { cache: 'no-store' }),
        fetch('/api/portal/admin/users?role=reviewer&status=active', { cache: 'no-store' }),
      ]);
      const [pData, iData, rData] = await Promise.all([
        pRes.json(),
        iRes.json(),
        rRes.json(),
      ]);
      setPapers(pData.papers || []);
      setIssues(iData.issues || []);
      setReviewers(rData.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (issueFilter !== 'all' && p.targetIssue?._id !== issueFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.paperId?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.submittedBy?.name?.toLowerCase().includes(q) ||
          p.submittedBy?.email?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [papers, statusFilter, issueFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, issueFilter, search]);

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(paginated.map((p) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExportCsv = async () => {
    setNotice('');
    const res = await fetch('/api/portal/admin/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'export',
        paperIds: selectedIds.length > 0 ? selectedIds : filtered.map((p) => p._id),
      }),
    });
    const data = await res.json();
    if (res.ok && data.csv) {
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wisdom-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Exported ${data.count} submission(s) to CSV.`);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setProcessingBulk(true);
    setNotice('');
    try {
      const res = await fetch('/api/portal/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          paperIds: selectedIds,
          autoAssign: bulkAuto,
          reviewerIds: bulkAuto ? [] : bulkReviewerIds,
          deadline: bulkDeadline || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkModalOpen(false);
        setSelectedIds([]);
        setBulkReviewerIds([]);
        setNotice(`Created ${data.assignmentsCreated} reviewer assignment(s) across selected papers.`);
        await loadAll();
      } else {
        setNotice(data.error || 'Bulk assignment failed.');
      }
    } finally {
      setProcessingBulk(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">All Manuscript Submissions</h1>
          <p className="portal-page-subtitle">
            Filter, bulk-assign peer reviewers, export CSV reports, and inspect full paper lifecycles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="portal-btn portal-btn-primary portal-btn-sm"
              onClick={() => setBulkModalOpen(true)}
            >
              Bulk Assign ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            className="portal-btn portal-btn-outline portal-btn-sm"
            onClick={handleExportCsv}
          >
            Export CSV {selectedIds.length > 0 ? `(${selectedIds.length})` : '(All)'}
          </button>
        </div>
      </div>

      {notice && <div className="portal-alert info"><span>{notice}</span></div>}

      <div className="portal-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <SearchBar
            placeholder="Search Paper ID, title, or submitter..."
            value={search}
            onSearch={setSearch}
          />
          <select
            className="portal-select"
            style={{ width: 'auto', minWidth: '170px' }}
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
            <option value="withdrawn">Withdrawn</option>
          </select>
          <select
            className="portal-select"
            style={{ width: 'auto', minWidth: '210px' }}
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
          >
            <option value="all">All Journal Issues</option>
            {issues.map((iss) => (
              <option key={iss._id} value={iss._id}>
                {iss.title || `Vol ${iss.volume} Issue ${iss.issue}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="portal-skeleton" style={{ height: '260px' }} />
      ) : paginated.length === 0 ? (
        <EmptyState
          title="No submissions match your filters"
          description="Try clearing search or filter criteria."
        />
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selectedIds.length === paginated.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Paper ID</th>
                <th>Title & Author</th>
                <th>Issue</th>
                <th>Reviews</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p._id} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p._id)}
                      onChange={() => toggleOne(p._id)}
                    />
                  </td>
                  <td onClick={() => router.push(`/portal/admin/paper/${p._id}`)}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                      {p.paperId}
                    </span>
                  </td>
                  <td onClick={() => router.push(`/portal/admin/paper/${p._id}`)}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {p.submittedBy?.name} ({p.submittedBy?.email})
                    </div>
                  </td>
                  <td onClick={() => router.push(`/portal/admin/paper/${p._id}`)}>
                    <span className="portal-tag">
                      {p.targetIssue?.title || `Vol ${p.targetIssue?.volume} Issue ${p.targetIssue?.issue}`}
                    </span>
                  </td>
                  <td onClick={() => router.push(`/portal/admin/paper/${p._id}`)}>
                    <strong>{p.reviewStats?.completed || 0}</strong> / {p.reviewStats?.total || 0}
                  </td>
                  <td onClick={() => router.push(`/portal/admin/paper/${p._id}`)}>
                    {p.reviewStats?.nearestDeadline ? (
                      <DeadlineCountdown deadline={p.reviewStats.nearestDeadline} label="Due" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td onClick={() => router.push(`/portal/admin/paper/${p._id}`)}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td
                    onClick={() => router.push(`/portal/admin/paper/${p._id}`)}
                    style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#64748b' }}
                  >
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Bulk Assign Reviewers (${selectedIds.length} papers)`}
      >
        <form onSubmit={handleBulkAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className={`portal-btn portal-btn-sm ${bulkAuto ? 'portal-btn-primary' : 'portal-btn-outline'}`}
              onClick={() => setBulkAuto(true)}
            >
              ⚡ Smart Auto-Assign (2 per paper)
            </button>
            <button
              type="button"
              className={`portal-btn portal-btn-sm ${!bulkAuto ? 'portal-btn-primary' : 'portal-btn-outline'}`}
              onClick={() => setBulkAuto(false)}
            >
              Manual Selection
            </button>
          </div>

          {!bulkAuto && (
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {reviewers.map((r) => {
                const checked = bulkReviewerIds.includes(r._id);
                return (
                  <label key={r._id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem', borderRadius: '8px', background: checked ? '#eef2ff' : '#f8fafc', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setBulkReviewerIds((p) => [...p, r._id]);
                        else setBulkReviewerIds((p) => p.filter((x) => x !== r._id));
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.name}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({r.affiliation || r.email})</span>
                  </label>
                );
              })}
            </div>
          )}

          {!bulkAuto && (
            <div>
              <label className="portal-label">Review Deadline (optional)</label>
              <input
                type="date"
                className="portal-input"
                value={bulkDeadline}
                onChange={(e) => setBulkDeadline(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" className="portal-btn portal-btn-outline" onClick={() => setBulkModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="portal-btn portal-btn-primary" disabled={processingBulk}>
              {processingBulk ? 'Assigning...' : 'Run Bulk Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
