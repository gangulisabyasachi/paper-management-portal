import { connectDB } from '../db';
import ActivityLog from '../../models/ActivityLog';

/**
 * Log a user action to the ActivityLog collection.
 *
 * @param {Object} options
 * @param {string} [options.userId]      - ID of the PortalUser who performed the action.
 * @param {string} options.action        - Action identifier (e.g. 'PAPER_SUBMITTED', 'REVIEW_COMPLETED').
 * @param {string} [options.targetModel] - Mongoose model name the action targets.
 * @param {string} [options.targetId]    - _id of the target document.
 * @param {*}      [options.details]     - Structured or string details of the action.
 * @param {string} [options.ipAddress]   - Request IP address for audit trails.
 * @returns {Promise<Object|null>} The created ActivityLog document.
 */
export default async function logActivity({
  userId,
  action,
  targetModel,
  targetId,
  details,
  ipAddress,
}) {
  try {
    await connectDB();

    const entry = await ActivityLog.create({
      user: userId || undefined,
      action,
      targetModel,
      targetId,
      details,
      ipAddress,
    });

    return entry;
  } catch (err) {
    console.error('ActivityLog error:', err);
    return null;
  }
}
