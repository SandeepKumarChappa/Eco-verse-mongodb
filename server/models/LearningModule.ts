import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, default: '' },
    options: { type: [String], default: [] },
    correct: { type: Number, default: 0 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    questions: { type: [quizQuestionSchema], default: [] },
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    duration: { type: String, default: '10 minutes' },
    content: { type: String, default: '' },
    points: { type: Number, default: 0 },
    quiz: { type: quizSchema, default: undefined },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const learningModuleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    lessons: { type: [lessonSchema], default: [] },
    createdAt: { type: Number, default: () => Date.now() },
    createdByUserId: { type: String, default: '' },
    visibility: { type: String, enum: ['school', 'global', 'draft'], default: 'school' },
  },
  { timestamps: false }
);

export const LearningModule = mongoose.model('LearningModule', learningModuleSchema);
