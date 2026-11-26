import { verifyPortalSession } from './session';

/**
 * Verify the portal session and assert the user holds one of the allowed roles.
 *
 * @param {...string} roles - One or more roles that are permitted (e.g. 'admin', 'editor').
 * @returns {Promise<Object|null>} The session payload if authorised, or null.
 */
export async function requireRole(...roles) {
  const session = await verifyPortalSession();

  if (!session) {
    return null;
  }

  if (!roles.includes(session.role)) {
    return null;
  }

  return session;
}

export function isAdmin(session) {
  return session?.role === 'admin';
}

export function isEditor(session) {
  return session?.role === 'editor';
}

export function isReviewer(session) {
  return session?.role === 'reviewer';
}

export function isSubmitter(session) {
  return session?.role === 'submitter';
}

/**
 * Determine whether the current session is allowed to manage (view/edit) a paper.
 */
export function canManagePaper(session, paper) {
  if (!session || !paper) return false;

  if (isAdmin(session) || isEditor(session)) {
    return true;
  }

  const ownerRef = paper.submittedBy?._id || paper.submittedBy || paper.userId || '';
  return ownerRef.toString() === session.userId;
}

/**
 * Determine whether the current session is allowed to view a review.
 * - admin / editor -> see all reviews
 * - reviewer       -> see only their own reviews
 * - submitter      -> see commentsToAuthor only after a decision has been made
 */
export function canViewReview(session, review, paper) {
  if (!session || !review || !paper) return false;

  if (isAdmin(session) || isEditor(session)) {
    return true;
  }

  if (isReviewer(session)) {
    const revId = review.reviewer?._id || review.reviewer || '';
    return revId.toString() === session.userId;
  }

  if (isSubmitter(session)) {
    const ownerRef = paper.submittedBy?._id || paper.submittedBy || paper.userId || '';
    const isOwner = ownerRef.toString() === session.userId;
    const hasDecision = !!(
      paper.decisionDate ||
      paper.decisionLetter ||
      ['accepted', 'rejected', 'revisions_requested'].includes(paper.status)
    );
    return isOwner && hasDecision;
  }

  return false;
}
