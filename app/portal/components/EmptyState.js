'use client';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="portal-empty-state">
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '14px',
          background: '#eef2ff',
          color: '#4f46e5',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        {icon || (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
          {description}
        </p>
      )}
      {action && (
        <button type="button" onClick={action.onClick} className="portal-btn portal-btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
