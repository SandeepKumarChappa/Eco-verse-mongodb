import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true, default: [] },
    answerIndex: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    points: { type: Number, default: 3 },
    questions: { type: [quizQuestionSchema], default: [] },
    createdByUserId: { type: String, required: true, index: true },
    schoolId: { type: String, default: '', index: true },
    createdAt: { type: Number, required: true, index: true },
    visibility: { type: String, enum: ['global', 'school'], default: 'school', index: true },
  },
  {
    timestamps: true,
  }
);

// Performance index for teacher overview count queries
quizSchema.index({ createdByUserId: 1 });

export const Quiz = mongoose.model('Quiz', quizSchema);
