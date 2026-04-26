import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    points: { type: Number, default: 0 },
    icon: { type: String, default: '' },
    externalUrl: { type: String, required: true },
    image: { type: String, default: '' },
    createdAt: { type: Number, default: () => Date.now() },
    createdByUserId: { type: String, default: '' },
  },
  { timestamps: false }
);

export const Game = mongoose.model('Game', gameSchema);
