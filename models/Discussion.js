import mongoose from 'mongoose';

const MessageSubSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
    },
    content: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const DiscussionSchema = new mongoose.Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: [true, 'Paper reference is required'],
    },
    messages: [MessageSubSchema],
  },
  { timestamps: true }
);

DiscussionSchema.index({ paper: 1 });

const Discussion =
  mongoose.models.Discussion ||
  mongoose.model('Discussion', DiscussionSchema);

export default Discussion;
