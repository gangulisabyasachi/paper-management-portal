import mongoose from 'mongoose';

const PortalUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['submitter', 'reviewer', 'editor', 'admin'],
      required: [true, 'Role is required'],
    },
    affiliation: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    academicDesignation: {
      type: String,
      trim: true,
    },
    expertise: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PortalUser',
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Number,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

PortalUserSchema.index({ role: 1, status: 1 });

const PortalUser =
  mongoose.models.PortalUser ||
  mongoose.model('PortalUser', PortalUserSchema);

export default PortalUser;
