import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function checkUsers() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Get the users collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 1. Count users
    const userCount = await usersCollection.countDocuments();
    console.log(`📊 Total Users: ${userCount}\n`);
    
    // 2. List all users with username and role
    const users = await usersCollection
      .find({}, { projection: { username: 1, role: 1, _id: 0 } })
      .toArray();
    
    console.log('👥 All Users:');
    console.table(users);
    
    // 3. Count by role
    const adminCount = await usersCollection.countDocuments({ role: 'admin' });
    const teacherCount = await usersCollection.countDocuments({ role: 'teacher' });
    const studentCount = await usersCollection.countDocuments({ role: 'student' });
    
    console.log('\n📋 Users by Role:');
    console.log(`  Admin: ${adminCount}`);
    console.log(`  Teacher: ${teacherCount}`);
    console.log(`  Student: ${studentCount}`);
    
    // Check requirements
    console.log('\n✓ Requirements Check:');
    console.log(`  ${adminCount >= 1 ? '✅' : '❌'} At least 1 admin (found: ${adminCount})`);
    console.log(`  ${teacherCount >= 1 ? '✅' : '❌'} At least 1 teacher (found: ${teacherCount})`);
    console.log(`  ${studentCount >= 1 ? '✅' : '❌'} At least 1 student (found: ${studentCount})`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
