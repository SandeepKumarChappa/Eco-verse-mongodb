import mongoose from 'mongoose';

const taskGroupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    teacherUserId: { type: String, default: '', index: true },
    taskId: { type: String, default: '' },
    taskIds: { type: [String], default: [] },
    memberUserIds: { type: [String], default: [] },
    createdAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: false }
);

export const TaskGroup = mongoose.model('TaskGroup', taskGroupSchema);
