import { connectDB } from '../db';
import Paper from '../../models/Paper';

/**
 * Generate a unique sequential paper ID in the format WISDOM-YYYY-XXXX.
 *
 * Queries the Paper collection for the highest existing sequence number in the
 * current year and increments it. The numeric suffix is zero-padded to 4 digits,
 * allowing up to 9999 papers per year.
 *
 * @returns {Promise<string>} A new paper ID, e.g. "WISDOM-2026-0001".
 */
export default async function generatePaperId() {
  await connectDB();

  const currentYear = new Date().getFullYear();
  const prefix = `WISDOM-${currentYear}-`;

  // Find the paper with the highest sequence number for this year.
  // paperId is stored as "WISDOM-YYYY-XXXX", so we sort descending and take the first.
  const latestPaper = await Paper.findOne({
    paperId: { $regex: `^${prefix}` },
  })
    .sort({ paperId: -1 })
    .select('paperId')
    .lean();

  let nextNumber = 1;

  if (latestPaper?.paperId) {
    const lastSegment = latestPaper.paperId.split('-').pop();
    const parsed = parseInt(lastSegment, 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  const paddedNumber = String(nextNumber).padStart(4, '0');
  return `${prefix}${paddedNumber}`;
}
