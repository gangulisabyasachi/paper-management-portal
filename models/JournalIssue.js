import mongoose from 'mongoose';

const JournalIssueSchema = new mongoose.Schema(
  {
    volume: {
      type: Number,
      required: [true, 'Volume number is required'],
    },
    issue: {
      type: Number,
      required: [true, 'Issue number is required'],
    },
    title: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'archived'],
      default: 'open',
    },
    submissionDeadline: {
      type: Date,
    },
    reviewDeadline: {
      type: Date,
    },
    editorInChief: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
    },
    description: {
      type: String,
      trim: true,
    },
    publishedDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

JournalIssueSchema.index({ volume: 1, issue: 1 }, { unique: true });

const JournalIssue =
  mongoose.models.JournalIssue ||
  mongoose.model('JournalIssue', JournalIssueSchema);

export default JournalIssue;
