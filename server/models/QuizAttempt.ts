import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    quizId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    answers: { type: [Number], default: [] },
    score: { type: Number, required: true, default: 0 },
    submittedAt: { type: Number, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ quizId: 1, userId: 1 }, { unique: true });

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
