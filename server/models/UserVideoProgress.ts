import mongoose from 'mongoose';

const userVideoProgressSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    videoId: { type: String, required: true, index: true },
    watched: { type: Boolean, default: false },
    watchedAt: { type: Number, default: null },
    creditsAwarded: { type: Boolean, default: false },
  },
  { timestamps: false }
);

// Compound index: one progress record per user per video
userVideoProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const UserVideoProgress = mongoose.model('UserVideoProgress', userVideoProgressSchema);
