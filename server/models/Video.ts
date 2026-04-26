import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['youtube', 'file'], default: 'youtube' },
    url: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    credits: { type: Number, default: 0 },
    uploadedBy: { type: String, required: true, index: true },
    category: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    uploadedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: false }
);

// Performance index for teacher overview count queries
videoSchema.index({ uploadedBy: 1 });

export const Video = mongoose.model('Video', videoSchema);
