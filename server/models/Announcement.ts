import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
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
    body: {
      type: String,
      required: true,
    },
    createdAt: {
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
    visibility: {
      type: String,
      enum: ['global', 'school'],
      default: 'school',
    },
  },
  {
    timestamps: true,
  }
);

// Performance index for teacher overview count queries
announcementSchema.index({ createdByUserId: 1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);