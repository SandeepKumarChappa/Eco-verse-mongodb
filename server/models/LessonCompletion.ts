import mongoose from 'mongoose';

const lessonCompletionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentUserId: { type: String, required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    moduleTitle: { type: String, default: '' },
    lessonId: { type: String, required: true },
    lessonTitle: { type: String, default: '' },
    points: { type: Number, default: 0 },
    completedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: false }
);

// Compound index: one completion record per student per lesson
lessonCompletionSchema.index({ studentUserId: 1, moduleId: 1, lessonId: 1 });

export const LessonCompletion = mongoose.model('LessonCompletion', lessonCompletionSchema);
