'use client';

import { useEffect, useState, useMemo } from 'react';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';

const ROLE_TABS = ['all', 'admin', 'editor', 'reviewer', 'submitter'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleTab, setRoleTab] = useState('all');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'reviewer',
    affiliation: '',
    expertise: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/admin/users', { cache: 'no-store' });
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleTab !== 'all' && u.role !== roleTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.affiliation?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, roleTab, search]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'editor',
      affiliation: '',
      expertise: '',
      status: 'active',
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'submitter',
      affiliation: u.affiliation || '',
      expertise: (u.expertise || []).join(', '),
      status: u.status || 'active',
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
      const url = editingUser
        ? `/api/portal/admin/users/${editingUser._id}`
        : '/api/portal/admin/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const payload = {
        name: form.name,
        role: form.role,
        affiliation: form.affiliation,
        expertise: form.expertise,
        status: form.status,
      };
      if (!editingUser) {
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
        setError(data.error || 'Failed to save user.');
      } else {
        setModalOpen(false);
        setNotice(editingUser ? 'User updated.' : `Account created for ${data.user.email}.`);
        await loadUsers();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="portal-page-title">All Portal Users & Roles</h1>
          <p className="portal-page-subtitle">
            Manage Master Admins, Editors-in-Chief, Reviewers, and Submitters across the platform.
          </p>
        </div>
        <button type="button" className="portal-btn portal-btn-primary" onClick={openCreate}>
          + Create Portal User
        </button>
      </div>

      {notice && <div className="portal-alert success"><span>{notice}</span></div>}

      <div className="portal-card">
        <div className="portal-tabs">
          {ROLE_TABS.map((r) => (
            <button
              key={r}
              type="button"
              className={`portal-tab ${roleTab === r ? 'active' : ''}`}
              onClick={() => setRoleTab(r)}
              style={{ textTransform: 'capitalize' }}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>
        <SearchBar
          placeholder="Search users by name, email, or affiliation..."
          value={search}
          onSearch={setSearch}
        />
      </div>

      {loading ? (
        <div className="portal-skeleton" style={{ height: '240px' }} />
      ) : (
        <div className="portal-table-container">
          <table className="portal-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Affiliation</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className="portal-tag" style={{ textTransform: 'capitalize', background: '#eef2ff', color: '#4338ca' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{u.affiliation || '—'}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="portal-btn portal-btn-outline portal-btn-sm"
                      onClick={() => openEdit(u)}
                    >
                      Manage
                    </button>
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
        title={editingUser ? `Manage ${editingUser.name}` : 'Create Portal User'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="portal-alert error"><span>{error}</span></div>}

          <div>
            <label className="portal-label">Full Name *</label>
            <input
              type="text"
              className="portal-input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          {!editingUser && (
            <div>
              <label className="portal-label">Email *</label>
              <input
                type="email"
                className="portal-input"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="portal-label">Role</label>
              <select
                className="portal-select"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="submitter">Submitter</option>
                <option value="reviewer">Reviewer</option>
                <option value="editor">Editor-in-Chief</option>
                <option value="admin">Master Admin</option>
              </select>
            </div>
            <div>
              <label className="portal-label">Status</label>
              <select
                className="portal-select"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="portal-label">
              {editingUser ? 'Reset Password (optional)' : 'Password (min 8 chars) *'}
            </label>
            <input
              type="password"
              className="portal-input"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required={!editingUser}
            />
          </div>

          <div>
            <label className="portal-label">Affiliation</label>
            <input
              type="text"
              className="portal-input"
              value={form.affiliation}
              onChange={(e) => setForm((p) => ({ ...p, affiliation: e.target.value }))}
            />
          </div>

          <div>
            <label className="portal-label">Expertise Tags (comma-separated)</label>
            <input
              type="text"
              className="portal-input"
              value={form.expertise}
              onChange={(e) => setForm((p) => ({ ...p, expertise: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" className="portal-btn portal-btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="portal-btn portal-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
