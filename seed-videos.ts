import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Video } from './server/models/Video';

async function seedVideos() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  const dataPath = path.join(process.cwd(), 'server', 'data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Unable to find data file at ${dataPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as any;
  const videos = Array.isArray(raw.videos) ? raw.videos : [];
  if (!videos.length) {
    console.log('No videos found in server/data.json');
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected to MongoDB');

  let inserted = 0;
  let skipped = 0;

  for (const video of videos) {
    const id = String(video?.id || '').trim();
    const url = String(video?.url || '').trim();
    if (!id || !url) {
      skipped++;
      continue;
    }

    const existing = await Video.findOne({ id }).lean();
    if (existing) {
      skipped++;
      continue;
    }

    await Video.create({
      id,
      title: String(video?.title || 'Untitled Video'),
      description: String(video?.description || ''),
      type: String(video?.type || 'youtube'),
      url,
      thumbnail: String(video?.thumbnail || ''),
      credits: Number(video?.credits ?? 0),
      uploadedBy: String(video?.uploadedBy || 'system'),
      category: String(video?.category || ''),
      duration: Number(video?.duration ?? 0),
      uploadedAt: Number(video?.uploadedAt ?? Date.now()),
    });

    inserted++;
  }

  const count = await Video.countDocuments();
  console.log(`Seed videos completed. inserted=${inserted}, skipped=${skipped}`);
  console.log('Total videos:', count);
}

seedVideos()
  .catch((err) => {
    console.error('Seed videos failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
