import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    studentUserId: {
      type: String,
      required: true,
      index: true,
    },
    photoDataUrl: String,
    photos: {
      type: [String],
      default: [],
    },
    submittedAt: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['submitted', 'approved', 'rejected'],
      default: 'submitted',
      index: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    feedback: String,
    reviewedByUserId: String,
    reviewedAt: Number,
    groupId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for teacher overview queries
// Compound index for pending submission count aggregation
submissionSchema.index({ taskId: 1, status: 1 });
// Index for student submission lookups
submissionSchema.index({ studentUserId: 1, status: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
