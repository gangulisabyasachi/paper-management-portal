import { connectDB } from '../db';
import Paper from '../../models/Paper';
import PortalUser from '../../models/PortalUser';
import Review from '../../models/Review';
import JournalIssue from '../../models/JournalIssue';
import ActivityLog from '../../models/ActivityLog';

/**
 * Score a reviewer candidate based on keyword overlap and inverse workload.
 * @param {Object}   reviewer       - Reviewer document (with expertise, _id).
 * @param {string[]} paperKeywords  - The paper's keyword list (lowercased).
 * @param {Map}      workloadMap    - Map of reviewerId -> active assignment count.
 * @returns {number} Composite score (higher is better).
 */
function scoreReviewer(reviewer, paperKeywords, workloadMap) {
  const expertiseTags = (reviewer.expertise || []).map((t) => t.toLowerCase().trim());
  const keywordMatchCount = expertiseTags.filter((tag) =>
    paperKeywords.some((kw) => kw.includes(tag) || tag.includes(kw))
  ).length;

  const activeCount = workloadMap.get(reviewer._id.toString()) || 0;
  const workloadScore = 1 / (1 + activeCount);

  return keywordMatchCount * 10 + workloadScore;
}

/**
 * Automatically assign reviewers to a paper based on expertise match and
 * workload balance, while filtering out conflicts of interest and existing assignments.
 * Gracefully assigns up to `count` available eligible reviewers without failing
 * submission if fewer reviewers exist yet.
 *
 * @param {string} paperId - The Mongo _id of the Paper document.
 * @param {number} [count=2] - Number of reviewers to assign.
 * @param {string|null} [assignedBy=null] - PortalUser ID triggering the assignment.
 * @returns {Promise<string[]>} Array of assigned reviewer user IDs.
 */
export async function autoAssignReviewers(paperId, count = 2, assignedBy = null) {
  await connectDB();

  const paper = await Paper.findById(paperId).lean();
  if (!paper) {
    throw new Error(`Paper not found: ${paperId}`);
  }

  const issue = paper.targetIssue
    ? await JournalIssue.findById(paper.targetIssue).lean()
    : null;

  const defaultDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const reviewDeadline =
    issue?.reviewDeadline && new Date(issue.reviewDeadline) > new Date()
      ? new Date(issue.reviewDeadline)
      : defaultDeadline;

  const paperKeywords = (paper.keywords || []).map((k) => k.toLowerCase().trim());

  const authorAffiliations = new Set(
    (paper.authors || [])
      .map((a) => a.affiliation?.toLowerCase().trim())
      .filter(Boolean)
  );
  const authorEmails = new Set(
    (paper.authors || [])
      .map((a) => a.email?.toLowerCase().trim())
      .filter(Boolean)
  );

  // Exclude reviewers already assigned (or previously declined) on this paper
  const existingReviews = await Review.find({ paper: paperId })
    .select('reviewer')
    .lean();
  const excludedIds = new Set(existingReviews.map((r) => r.reviewer.toString()));
  if (paper.submittedBy) {
    excludedIds.add(paper.submittedBy.toString());
  }

  // Find all active reviewers
  const reviewers = await PortalUser.find({
    role: 'reviewer',
    status: 'active',
  }).lean();

  // Filter out conflict-of-interest reviewers and already-assigned reviewers
  const eligible = reviewers.filter((reviewer) => {
    if (excludedIds.has(reviewer._id.toString())) return false;
    if (authorEmails.has((reviewer.email || '').toLowerCase().trim())) return false;

    const reviewerAffiliation = (reviewer.affiliation || '').toLowerCase().trim();
    if (reviewerAffiliation && authorAffiliations.has(reviewerAffiliation)) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return [];
  }

  // Build workload map (active/pending/accepted/in_progress review count per reviewer)
  const activeReviews = await Review.aggregate([
    { $match: { status: { $in: ['pending', 'accepted', 'in_progress'] } } },
    { $group: { _id: '$reviewer', count: { $sum: 1 } } },
  ]);

  const workloadMap = new Map(
    activeReviews.map((entry) => [entry._id.toString(), entry.count])
  );

  const scored = eligible
    .map((reviewer) => ({
      reviewer,
      score: scoreReviewer(reviewer, paperKeywords, workloadMap),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, Math.min(count, scored.length));

  const reviewDocs = selected.map(({ reviewer }) => ({
    paper: paperId,
    reviewer: reviewer._id,
    status: 'pending',
    deadline: reviewDeadline,
    assignedAt: new Date(),
    ...(assignedBy ? { assignedBy } : {}),
  }));

  const activityDocs = selected.map(({ reviewer }) => ({
    user: assignedBy || reviewer._id,
    action: 'REVIEWER_AUTO_ASSIGNED',
    targetModel: 'Paper',
    targetId: paperId,
    details: {
      paperId: paper.paperId,
      reviewerId: reviewer._id,
      reviewerName: reviewer.name,
      reviewerEmail: reviewer.email,
    },
  }));

  await Review.insertMany(reviewDocs);
  await ActivityLog.insertMany(activityDocs);

  if (paper.status === 'submitted' || paper.status === 'revised') {
    await Paper.findByIdAndUpdate(paperId, { status: 'under_review' });
  }

  return selected.map(({ reviewer }) => reviewer._id.toString());
}

export default autoAssignReviewers;
