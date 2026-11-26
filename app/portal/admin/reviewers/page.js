'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  affiliation: '',
  expertise: '',
  status: 'active',
};

export default function AdminReviewersPage() {
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReviewers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/admin/users?role=reviewer', {
        cache: 'no-store',
      });
      const data = await res.json();
      setReviewers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewers();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (rev) => {
    setEditingId(rev._id);
    setForm({
      name: rev.name || '',
      email: rev.email || '',
      password: '',
      affiliation: rev.affiliation || '',
      expertise: (rev.expertise || []).join(', '),
      status: rev.status || 'active',
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
        ? `/api/portal/admin/users/${editingId}`
        : '/api/portal/admin/users';
      const method = editingId ? 'PATCH' : 'POST';

      const payload = {
        name: form.name,
        affiliation: form.affiliation,
        expertise: form.expertise,
        status: form.status,
        role: 'reviewer',
      };
      if (!editingId) {
        payload.email = form.email;
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save reviewer.');
      } else {
        setModalOpen(false);
        setNotice(
          editingId
            ? 'Reviewer account updated.'
            : `Reviewer login created for ${data.user.email}.`
        );
        await loadReviewers();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (rev) => {
    const nextStatus = rev.status === 'active' ? 'inactive' : 'active';
    await fetch(`/api/portal/admin/users/${rev._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadReviewers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">Peer Reviewers Directory</h1>
          <p className="portal-page-subtitle">
            Create reviewer logins, tag subject expertise for smart auto-assignment, and monitor review loads.
          </p>
        </div>
        <button type="button" className="portal-btn portal-btn-primary" onClick={openCreate}>
          + Create Reviewer Login
        </button>
      </div>

      {notice && <div className="portal-alert success"><span>{notice}</span></div>}

      {loading ? (
        <div className="portal-skeleton" style={{ height: '240px' }} />
      ) : reviewers.length === 0 ? (
        <EmptyState
          title="No reviewer accounts yet"
          description="Create reviewer logins with expertise keywords so the portal can auto-assign incoming submissions."
          action={{ label: 'Create First Reviewer', onClick: openCreate }}
        />
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Affiliation</th>
                <th>Expertise Tags</th>
                <th>Workload</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewers.map((rev) => (
                <tr key={rev._id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{rev.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{rev.email}</div>
                  </td>
                  <td style={{ fontSize: '0.86rem' }}>{rev.affiliation || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(rev.expertise || []).length > 0 ? (
                        rev.expertise.map((tag, i) => (
                          <span key={i} className="portal-tag" style={{ background: '#eef2ff', color: '#4338ca' }}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="portal-badge in-progress" style={{ marginRight: '0.35rem' }}>
                      {rev.activeReviews || 0} active
                    </span>
                    <span className="portal-badge completed">
                      {rev.completedReviews || 0} done
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={rev.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        className="portal-btn portal-btn-outline portal-btn-sm"
                        onClick={() => openEdit(rev)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="portal-btn portal-btn-ghost portal-btn-sm"
                        onClick={() => toggleStatus(rev)}
                      >
                        {rev.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Reviewer Account' : 'Create Reviewer Login'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="portal-alert error"><span>{error}</span></div>}

          <div>
            <label className="portal-label">Full Name *</label>
            <input
              type="text"
              className="portal-input"
              placeholder="Prof. Ananya Roy"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          {!editingId && (
            <div>
              <label className="portal-label">Email Address *</label>
              <input
                type="email"
                className="portal-input"
                placeholder="reviewer@university.edu"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
          )}

          <div>
            <label className="portal-label">
              {editingId ? 'New Password (leave blank to keep current)' : 'Initial Password (min 8 chars) *'}
            </label>
            <input
              type="password"
              className="portal-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required={!editingId}
            />
          </div>

          <div>
            <label className="portal-label">Affiliation / Institution</label>
            <input
              type="text"
              className="portal-input"
              placeholder="Used for conflict-of-interest checks"
              value={form.affiliation}
              onChange={(e) => setForm((p) => ({ ...p, affiliation: e.target.value }))}
            />
          </div>

          <div>
            <label className="portal-label">Expertise Keywords (comma-separated)</label>
            <input
              type="text"
              className="portal-input"
              placeholder="Constitutional Law, AI Ethics, Corporate Governance"
              value={form.expertise}
              onChange={(e) => setForm((p) => ({ ...p, expertise: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" className="portal-btn portal-btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="portal-btn portal-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Reviewer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
