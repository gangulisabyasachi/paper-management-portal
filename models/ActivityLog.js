import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    targetModel: {
      type: String,
      trim: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ user: 1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ targetModel: 1, targetId: 1 });
ActivityLogSchema.index({ createdAt: -1 });

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model('ActivityLog', ActivityLogSchema);

export default ActivityLog;
