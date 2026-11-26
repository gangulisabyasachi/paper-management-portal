import mongoose from 'mongoose';

const AuthorSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    academicDesignation: { type: String, required: true, trim: true },
    affiliation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const FileSubSchema = new mongoose.Schema(
  {
    version: { type: Number },
    filename: { type: String },
    originalName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    size: { type: Number },
  },
  { _id: false }
);

const PaperSchema = new mongoose.Schema(
  {
    paperId: {
      type: String,
      required: [true, 'Paper ID is required'],
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    abstract: {
      type: String,
      required: [true, 'Abstract is required'],
      trim: true,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    authors: [AuthorSubSchema],
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
      required: [true, 'Submitter is required'],
    },
    targetIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalIssue',
      required: [true, 'Target issue is required'],
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'revisions_requested',
        'revised',
        'accepted',
        'rejected',
        'withdrawn',
      ],
      default: 'submitted',
    },
    files: [FileSubSchema],
    currentVersion: {
      type: Number,
      default: 1,
    },
    decisionLetter: {
      type: String,
      trim: true,
    },
    decisionDate: {
      type: Date,
    },
    plagiarismScore: {
      type: Number,
    },
    plagiarismFlagged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PaperSchema.index({ submittedBy: 1 });
PaperSchema.index({ targetIssue: 1 });
PaperSchema.index({ status: 1 });

/**
 * Generate a sequential paperId in the format WISDOM-YYYY-NNNN.
 * Finds the latest paper for the current year and increments the counter.
 */
PaperSchema.statics.generatePaperId = async function () {
  const year = new Date().getFullYear();
  const prefix = `WISDOM-${year}-`;

  const latest = await this.findOne({ paperId: { $regex: `^${prefix}` } })
    .sort({ paperId: -1 })
    .select('paperId')
    .lean();

  let nextNum = 1;
  if (latest) {
    const currentNum = parseInt(latest.paperId.split('-')[2], 10);
    nextNum = currentNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

const Paper =
  mongoose.models.Paper || mongoose.model('Paper', PaperSchema);

export default Paper;
