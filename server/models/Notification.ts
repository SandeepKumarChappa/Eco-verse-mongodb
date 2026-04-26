import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'task', 'quiz', 'announcement', 'game', 'lesson'],
      default: 'info',
    },
    createdAt: { type: Number, default: () => Date.now() },
    readAt: { type: Number, default: null },
  },
  { timestamps: false }
);

export const Notification = mongoose.model('Notification', notificationSchema);
