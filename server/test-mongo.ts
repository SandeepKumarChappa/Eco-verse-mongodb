import "dotenv/config";
import mongoose from 'mongoose';
import { MongoStorage } from './mongo-storage';
import { randomUUID } from 'crypto';

async function runTest() {
  console.log("Connect to MongoDB...");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found");
  
  await mongoose.connect(uri);
  console.log("✅ Connected");

  const storage = new MongoStorage();
  const testId = randomUUID();
  const testUsername = `testuser_${Date.now()}`;

  // 1. Test User
  console.log("\n--- Testing User ---");
  const available = await storage.isUsernameAvailable(testUsername);
  console.log("Is available:", available);

  const user = await storage.createUser({
    id: testId,
    username: testUsername,
    password: "hashed_password"
  });
  console.log("Created user:", user.username);

  const found = await storage.getUserByUsername(testUsername);
  console.log("Found by username:", found?.id === testId ? "YES" : "NO");

  // 2. Test Task
  console.log("\n--- Testing Task ---");
  const taskResult = await storage.createTask(testUsername, {
    id: randomUUID(),
    title: "Test Task",
    description: "Testing MongoDB storage",
    maxPoints: 10,
    schoolId: "test-school",
    groupMode: "solo"
  });
  if (taskResult.ok) {
    console.log("Created task:", taskResult.task.title);
    const tasks = await storage.listTeacherTasks(testUsername);
    console.log("Teacher task count:", tasks.length);
  } else {
    console.error("Task creation failed:", taskResult.error);
  }

  // 3. Test Announcement
  console.log("\n--- Testing Announcement ---");
  const annResult = await storage.createAnnouncement(testUsername, {
    id: randomUUID(),
    title: "Test Announcement",
    body: "Hello World",
    schoolId: "test-school",
    visibility: "school"
  });
  if (annResult.ok) {
    console.log("Created announcement:", annResult.announcement.title);
    const anns = await storage.listAnnouncementsForTeacher(testUsername);
    console.log("Teacher announcement count:", anns.length);
  } else {
    console.error("Announcement creation failed:", annResult.error);
  }

  console.log("\n✅ Test Completed Successfully");
  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
