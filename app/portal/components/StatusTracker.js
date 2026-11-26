'use client';

export default function StatusTracker({ currentStatus }) {
  if (currentStatus === 'withdrawn') {
    return (
      <div className="portal-alert warning">
        <span>This manuscript has been withdrawn by the submitting author.</span>
      </div>
    );
  }

  const hasRevisions =
    currentStatus === 'revisions_requested' || currentStatus === 'revised';

  const steps = hasRevisions
    ? [
        { key: 'submitted', label: 'Submitted' },
        { key: 'under_review', label: 'Under Review' },
        { key: 'revisions_requested', label: 'Revisions Requested' },
        { key: 'revised', label: 'Revised' },
        { key: 'decision', label: 'Final Decision' },
      ]
    : [
        { key: 'submitted', label: 'Submitted' },
        { key: 'under_review', label: 'Under Review' },
        {
          key: 'decision',
          label:
            currentStatus === 'accepted'
              ? 'Accepted'
              : currentStatus === 'rejected'
                ? 'Rejected'
                : 'Final Decision',
        },
      ];

  const getIndex = () => {
    if (currentStatus === 'submitted') return 0;
    if (currentStatus === 'under_review') return 1;
    if (currentStatus === 'revisions_requested') return 2;
    if (currentStatus === 'revised') return 3;
    if (currentStatus === 'accepted' || currentStatus === 'rejected') {
      return steps.length - 1;
    }
    return 0;
  };

  const activeIdx = getIndex();

  return (
    <div className="portal-status-tracker">
      {steps.map((step, idx) => {
        const isDone =
          idx < activeIdx ||
          (idx === steps.length - 1 && currentStatus === 'accepted');
        const isRejected =
          idx === steps.length - 1 && currentStatus === 'rejected';
        const isCurrent = idx === activeIdx && !isDone && !isRejected;

        const stateClass = isRejected
          ? 'rejected'
          : isDone
            ? 'done'
            : isCurrent
              ? 'current'
              : '';

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? 1 : 'initial', gap: '0.5rem' }}>
            <div className={`portal-tracker-step ${stateClass}`} style={{ flex: 'initial', minWidth: 'auto' }}>
              <div className="portal-tracker-dot">
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isRejected ? (
                  '✕'
                ) : (
                  idx + 1
                )}
              </div>
              <span
                style={{
                  fontSize: '0.83rem',
                  fontWeight: isCurrent || isDone || isRejected ? 700 : 500,
                  color: isRejected
                    ? '#dc2626'
                    : isCurrent
                      ? '#4f46e5'
                      : isDone
                        ? '#0f172a'
                        : '#94a3b8',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`portal-tracker-line ${idx < activeIdx ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
