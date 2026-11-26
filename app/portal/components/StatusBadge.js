'use client';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', className: 'submitted' },
  under_review: { label: 'Under Review', className: 'under-review' },
  revisions_requested: { label: 'Revisions Requested', className: 'revisions' },
  revised: { label: 'Revised', className: 'revised' },
  accepted: { label: 'Accepted', className: 'accepted' },
  rejected: { label: 'Rejected', className: 'rejected' },
  withdrawn: { label: 'Withdrawn', className: 'withdrawn' },
  pending: { label: 'Pending Response', className: 'pending' },
  in_progress: { label: 'In Progress', className: 'in-progress' },
  completed: { label: 'Completed', className: 'completed' },
  declined: { label: 'Declined', className: 'declined' },
  open: { label: 'Open for Submissions', className: 'accepted' },
  closed: { label: 'Closed', className: 'revisions' },
  archived: { label: 'Archived', className: 'withdrawn' },
  active: { label: 'Active', className: 'accepted' },
  inactive: { label: 'Inactive', className: 'withdrawn' },
  suspended: { label: 'Suspended', className: 'rejected' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    className: 'pending',
  };

  return <span className={`portal-badge ${cfg.className}`}>{cfg.label}</span>;
}
