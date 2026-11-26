'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
      } else {
        router.push(data.redirectTo || '/portal/dashboard');
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
          'radial-gradient(circle at top right, #e0e7ff 0%, #f4f6fb 48%, #ede9fe 100%)',
      }}
    >
      <div
        className="portal-card portal-reveal"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            className="portal-brand-badge"
            style={{ width: 52, height: 52, margin: '0 auto 1rem', borderRadius: '14px' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            WISDOM Manuscript Portal
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.35rem' }}>
            Unified Sign-In for Authors, Reviewers, Editors & Admins
          </p>
        </div>

        {error && (
          <div className="portal-alert error" style={{ marginBottom: '1.25rem' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label className="portal-label" htmlFor="portal-email">
              Email Address
            </label>
            <input
              id="portal-email"
              type="email"
              className="portal-input"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="portal-label" htmlFor="portal-password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="portal-password"
                type={showPassword ? 'text' : 'password'}
                className="portal-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '3.2rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.45rem',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="portal-btn portal-btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.82rem', fontSize: '0.95rem', marginTop: '0.25rem' }}
          >
            {loading ? 'Signing In...' : 'Sign In to Portal'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.65rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            fontSize: '0.86rem',
            color: '#475569',
          }}
        >
          <div>
            Submitting a manuscript?{' '}
            <Link href="/portal/signup" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
              Create Author Account →
            </Link>
          </div>
          <div>
            <a href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://wisdomj.in'} style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.82rem' }}>
              ← Return to WISDOM Journal Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
