import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    schoolId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdAt: { type: Number, default: () => Date.now() },
    // Student-specific fields
    studentId: { type: String },
    rollNumber: { type: String },
    className: { type: String },
    section: { type: String },
    // Teacher-specific fields
    teacherId: { type: String },
    subject: { type: String },
    // Shared optional
    photoDataUrl: { type: String },
  },
  {
    timestamps: false, // we manage createdAt ourselves
  }
);

export const Application = mongoose.model('Application', applicationSchema);
