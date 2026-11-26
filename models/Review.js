import mongoose from 'mongoose';

const ScoresSubSchema = new mongoose.Schema(
  {
    originality: { type: Number, min: 1, max: 10 },
    methodology: { type: Number, min: 1, max: 10 },
    clarity: { type: Number, min: 1, max: 10 },
    significance: { type: Number, min: 1, max: 10 },
    overall: { type: Number, min: 1, max: 10 },
  },
  { _id: false }
);

const ReviewSchema = new mongoose.Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: [true, 'Paper reference is required'],
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
      required: [true, 'Reviewer is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'in_progress', 'completed'],
      default: 'pending',
    },
    scores: ScoresSubSchema,
    recommendation: {
      type: String,
      enum: ['accept', 'minor_revisions', 'major_revisions', 'reject'],
    },
    commentsToAuthor: {
      type: String,
      trim: true,
    },
    confidentialComments: {
      type: String,
      trim: true,
    },
    deadline: {
      type: Date,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ paper: 1 });
ReviewSchema.index({ reviewer: 1 });
ReviewSchema.index({ paper: 1, reviewer: 1 });
ReviewSchema.index({ status: 1 });

const Review =
  mongoose.models.Review || mongoose.model('Review', ReviewSchema);

export default Review;
