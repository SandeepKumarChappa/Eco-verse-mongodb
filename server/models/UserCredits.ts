import mongoose from 'mongoose';

const userCreditsSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    totalCredits: { type: Number, default: 0 },
    lastUpdated: { type: Number, default: () => Date.now() },
  },
  { timestamps: false }
);

export const UserCredits = mongoose.model('UserCredits', userCreditsSchema);
