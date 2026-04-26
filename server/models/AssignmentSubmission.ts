import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    assignmentId: {
      type: String,
      required: true,
      index: true,
    },
    studentUserId: {
      type: String,
      required: true,
      index: true,
    },
    files: {
      type: [String],
      default: [],
    },
    submissionText: {
      type: String,
      default: '',
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
  },
  {
    timestamps: true,
  }
);

export const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
