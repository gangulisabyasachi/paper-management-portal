'use client';

export default function DeadlineCountdown({ deadline, label = 'Due' }) {
  if (!deadline) return null;

  const target = new Date(deadline);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let variant = 'ok';
  let text = `${label} in ${diffDays}d`;

  if (diffDays < 0) {
    variant = 'overdue';
    text = `Overdue by ${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    variant = 'urgent';
    text = 'Due today';
  } else if (diffDays < 3) {
    variant = 'urgent';
    text = `${label} in ${diffDays}d`;
  } else if (diffDays <= 7) {
    variant = 'warning';
    text = `${label} in ${diffDays}d`;
  }

  return (
    <span className={`portal-countdown ${variant}`} title={`Deadline: ${target.toLocaleDateString()}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {text}
    </span>
  );
}
