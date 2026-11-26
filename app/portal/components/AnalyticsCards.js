'use client';

export default function AnalyticsCards({ analytics }) {
  if (!analytics) return null;

  const sc = analytics.statusCounts || {};
  const pendingReview = (sc.submitted || 0) + (sc.under_review || 0) + (sc.revised || 0);

  return (
    <div className="portal-dashboard-grid">
      <div className="portal-stat-card indigo">
        <span className="portal-stat-title">Total Submissions</span>
        <span className="portal-stat-value">{analytics.totalPapers ?? 0}</span>
        <span className="portal-stat-sub">Across all journal issues</span>
      </div>

      <div className="portal-stat-card amber">
        <span className="portal-stat-title">Pending / In Review</span>
        <span className="portal-stat-value">{pendingReview}</span>
        <span className="portal-stat-sub">
          {analytics.overdueReviewsCount || 0} overdue assignment(s)
        </span>
      </div>

      <div className="portal-stat-card green">
        <span className="portal-stat-title">Accepted Papers</span>
        <span className="portal-stat-value">{sc.accepted ?? 0}</span>
        <span className="portal-stat-sub">Acceptance rate: {analytics.acceptanceRate ?? 0}%</span>
      </div>

      <div className="portal-stat-card red">
        <span className="portal-stat-title">Rejected Papers</span>
        <span className="portal-stat-value">{sc.rejected ?? 0}</span>
        <span className="portal-stat-sub">Revisions req: {sc.revisions_requested ?? 0}</span>
      </div>

      <div className="portal-stat-card violet">
        <span className="portal-stat-title">Active Reviewers</span>
        <span className="portal-stat-value">{analytics.totalReviewers ?? 0}</span>
        <span className="portal-stat-sub">Avg turnaround: {analytics.avgReviewDays ?? 0} days</span>
      </div>
    </div>
  );
}
