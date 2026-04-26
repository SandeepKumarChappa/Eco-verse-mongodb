import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      required: true,
    },
    schoolId: {
      type: String,
      default: '',
      index: true,
    },
    photoDataUrl: String,
    // Student specific
    studentId: String,
    rollNumber: String,
    className: String,
    section: String,
    // Teacher specific
    teacherId: String,
    subject: String,
    // Continue Learning tracking
    lastLessonOpened: {
      moduleId: String,
      moduleTitle: String,
      lessonId: String,
      lessonTitle: String,
      openedAt: Date,
    },
    // Privacy settings
    allowExternalView: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Performance index for teacher overview count queries
// Compound index for counting students in a school
profileSchema.index({ schoolId: 1, role: 1 });

export const Profile = mongoose.model('Profile', profileSchema);
