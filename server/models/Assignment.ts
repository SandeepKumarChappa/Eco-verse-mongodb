import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    deadline: {
      type: Date,
    },
    maxPoints: {
      type: Number,
      required: true,
      default: 100,
    },
    createdByUserId: {
      type: String,
      required: true,
      index: true,
    },
    schoolId: {
      type: String,
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['school', 'global'],
      default: 'school',
      index: true,
    },
    createdAt: {
      type: Number,
      required: true,
      default: () => Date.now(),
    },
  },
  {
    timestamps: true,
  }
);

// Performance index for teacher overview count queries
assignmentSchema.index({ createdByUserId: 1 });

export const Assignment = mongoose.model('Assignment', assignmentSchema);
