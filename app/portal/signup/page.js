'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PortalSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    affiliation: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/portal/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          affiliation: form.affiliation,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create account.');
      } else {
        router.push('/portal/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        background:
          'radial-gradient(circle at top left, #e0e7ff 0%, #f4f6fb 50%, #ede9fe 100%)',
      }}
    >
      <div
        className="portal-card portal-reveal"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.85rem' }}>
          <div
            className="portal-brand-badge"
            style={{ width: 52, height: 52, margin: '0 auto 1rem', borderRadius: '14px' }}
          >
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Author / Submitter Registration
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.35rem' }}>
            Create your WISDOM Portal account to submit manuscripts & track peer reviews
          </p>
        </div>

        {error && (
          <div className="portal-alert error" style={{ marginBottom: '1.25rem' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="portal-label">Full Name *</label>
            <input
              type="text"
              className="portal-input"
              placeholder="Dr. Aarav Sen"
              value={form.name}
              onChange={update('name')}
              required
            />
          </div>

          <div>
            <label className="portal-label">Email Address *</label>
            <input
              type="email"
              className="portal-input"
              placeholder="aarav.sen@university.edu"
              value={form.email}
              onChange={update('email')}
              required
            />
          </div>

          <div>
            <label className="portal-label">Institution / Affiliation *</label>
            <input
              type="text"
              className="portal-input"
              placeholder="University of Calcutta"
              value={form.affiliation}
              onChange={update('affiliation')}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="portal-label">Password *</label>
              <input
                type="password"
                className="portal-input"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={update('password')}
                required
              />
            </div>
            <div>
              <label className="portal-label">Confirm Password *</label>
              <input
                type="password"
                className="portal-input"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="portal-btn portal-btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.82rem', fontSize: '0.95rem', marginTop: '0.4rem' }}
          >
            {loading ? 'Creating Account...' : 'Register & Continue'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.15rem',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            fontSize: '0.86rem',
            color: '#475569',
          }}
        >
          Already have an account?{' '}
          <Link href="/portal/login" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
