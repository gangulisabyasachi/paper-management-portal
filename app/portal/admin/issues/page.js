'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const EMPTY_FORM = {
  volume: '',
  issue: '',
  title: '',
  description: '',
  status: 'open',
  submissionDeadline: '',
  reviewDeadline: '',
  editorInChief: '',
};

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [iRes, eRes] = await Promise.all([
        fetch('/api/portal/admin/issues', { cache: 'no-store' }),
        fetch('/api/portal/admin/users?role=editor', { cache: 'no-store' }),
      ]);
      const [iData, eData] = await Promise.all([iRes.json(), eRes.json()]);
      setIssues(iData.issues || []);
      setEditors(eData.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (iss) => {
    setEditingId(iss._id);
    setForm({
      volume: iss.volume || '',
      issue: iss.issue || '',
      title: iss.title || '',
      description: iss.description || '',
      status: iss.status || 'open',
      submissionDeadline: iss.submissionDeadline
        ? new Date(iss.submissionDeadline).toISOString().slice(0, 10)
        : '',
      reviewDeadline: iss.reviewDeadline
        ? new Date(iss.reviewDeadline).toISOString().slice(0, 10)
        : '',
      editorInChief: iss.editorInChief?._id || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const url = editingId
        ? `/api/portal/admin/issues/${editingId}`
        : '/api/portal/admin/issues';
      const method = editingId ? 'PATCH' : 'POST';
      const payload = {
        ...form,
        volume: Number(form.volume),
        issue: Number(form.issue),
        editorInChief: form.editorInChief || null,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save issue.');
      } else {
        setModalOpen(false);
        setNotice(editingId ? 'Journal issue updated.' : 'New journal issue created.');
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this empty issue?')) return;
    setNotice('');
    const res = await fetch(`/api/portal/admin/issues/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setNotice(data.error || 'Could not delete issue.');
    } else {
      setNotice('Issue deleted.');
      await loadData();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">Journal Volumes & Issues</h1>
          <p className="portal-page-subtitle">
            Configure open submission calls (e.g. WISDOM Journal Vol 2 Issue 2), deadlines, and Editors-in-Chief.
          </p>
        </div>
        <button type="button" className="portal-btn portal-btn-primary" onClick={openCreate}>
          + Create New Issue
        </button>
      </div>

      {notice && <div className="portal-alert info"><span>{notice}</span></div>}

      {loading ? (
        <div className="portal-skeleton" style={{ height: '220px' }} />
      ) : issues.length === 0 ? (
        <EmptyState
          title="No journal issues created yet"
          description="Create your first open volume & issue so submitters can select it when uploading papers."
          action={{ label: 'Create First Issue', onClick: openCreate }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {issues.map((iss) => (
            <div key={iss._id} className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                    Volume {iss.volume} • Issue {iss.issue}
                  </span>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                    {iss.title || `WISDOM Journal Vol ${iss.volume} Issue ${iss.issue}`}
                  </h3>
                </div>
                <StatusBadge status={iss.status} />
              </div>

              {iss.description && (
                <p style={{ fontSize: '0.85rem', color: '#475569' }}>{iss.description}</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px' }}>
                <div>
                  <strong>Submissions:</strong> {iss.paperCount || 0} paper(s)
                </div>
                <div>
                  <strong>Submission Deadline:</strong>{' '}
                  {iss.submissionDeadline ? new Date(iss.submissionDeadline).toLocaleDateString() : 'Not set'}
                </div>
                <div>
                  <strong>Default Review Deadline:</strong>{' '}
                  {iss.reviewDeadline ? new Date(iss.reviewDeadline).toLocaleDateString() : '14 days from assignment'}
                </div>
                <div>
                  <strong>Editor-in-Chief:</strong>{' '}
                  {iss.editorInChief ? iss.editorInChief.name : 'Unassigned'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto' }}>
                {iss.paperCount === 0 && (
                  <button
                    type="button"
                    className="portal-btn portal-btn-ghost portal-btn-sm"
                    style={{ color: '#dc2626' }}
                    onClick={() => handleDelete(iss._id)}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  className="portal-btn portal-btn-outline portal-btn-sm"
                  onClick={() => openEdit(iss)}
                >
                  Edit Issue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Journal Issue' : 'Create Journal Issue'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="portal-alert error"><span>{error}</span></div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="portal-label">Volume Number *</label>
              <input
                type="number"
                className="portal-input"
                min="1"
                value={form.volume}
                onChange={(e) => setForm((p) => ({ ...p, volume: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="portal-label">Issue Number *</label>
              <input
                type="number"
                className="portal-input"
                min="1"
                value={form.issue}
                onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="portal-label">Display Title *</label>
            <input
              type="text"
              className="portal-input"
              placeholder="e.g. WISDOM Journal Vol 4 Issue 1"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="portal-label">Description / Call Scope</label>
            <textarea
              className="portal-textarea"
              rows={3}
              placeholder="Multidisciplinary call for papers..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="portal-label">Submission Deadline</label>
              <input
                type="date"
                className="portal-input"
                value={form.submissionDeadline}
                onChange={(e) => setForm((p) => ({ ...p, submissionDeadline: e.target.value }))}
              />
            </div>
            <div>
              <label className="portal-label">Review Deadline</label>
              <input
                type="date"
                className="portal-input"
                value={form.reviewDeadline}
                onChange={(e) => setForm((p) => ({ ...p, reviewDeadline: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="portal-label">Status</label>
              <select
                className="portal-select"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="open">Open for Submissions</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="portal-label">Assign Editor-in-Chief</label>
              <select
                className="portal-select"
                value={form.editorInChief}
                onChange={(e) => setForm((p) => ({ ...p, editorInChief: e.target.value }))}
              >
                <option value="">None (Admin Managed)</option>
                {editors.map((ed) => (
                  <option key={ed._id} value={ed._id}>
                    {ed.name} ({ed.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="portal-btn portal-btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="portal-btn portal-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Issue' : 'Create Issue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
