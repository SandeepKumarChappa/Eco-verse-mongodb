import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
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
      type: Date, // FIXED
    },
    proofType: {
      type: String,
      enum: ['photo'],
      default: 'photo',
    },
    maxPoints: {
      type: Number,
      required: true,
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
    createdAt: {
      type: Number,
      required: true,
    },
    groupMode: {
      type: String,
      enum: ['solo', 'group'],
      default: 'solo',
    },
    maxGroupSize: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Performance index for teacher overview count queries
taskSchema.index({ createdByUserId: 1 });

export const Task = mongoose.model('Task', taskSchema);