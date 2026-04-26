import mongoose from 'mongoose';

const gamePlaySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentUserId: { type: String, required: true, index: true },
    gameId: { type: String, required: true, index: true },
    points: { type: Number, default: 0 },
    playedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: false }
);

export const GamePlay = mongoose.model('GamePlay', gamePlaySchema);
