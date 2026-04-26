import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

async function checkProfiles() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    const db = mongoose.connection.db;
    const profilesCollection = db.collection('profiles');
    const applicationsCollection = db.collection('applications');
    
    // 1. Count profiles
    const profileCount = await profilesCollection.countDocuments();
    console.log(`📊 Total Profiles: ${profileCount}\n`);
    
    // 2. List all profiles with username and role
    const profiles = await profilesCollection
      .find({}, { projection: { username: 1, role: 1, _id: 0 } })
      .toArray();
    
    console.log('👥 All Profiles:');
    console.table(profiles);
    
    // 3. Count by role
    const adminCount = await profilesCollection.countDocuments({ role: 'admin' });
    const teacherCount = await profilesCollection.countDocuments({ role: 'teacher' });
    const studentCount = await profilesCollection.countDocuments({ role: 'student' });
    
    console.log('\n📋 Profiles by Role:');
    console.log(`  Admin: ${adminCount}`);
    console.log(`  Teacher: ${teacherCount}`);
    console.log(`  Student: ${studentCount}`);
    
    // Check requirements
    console.log('\n✓ Requirements Check:');
    console.log(`  ${adminCount >= 1 ? '✅' : '❌'} At least 1 admin (found: ${adminCount})`);
    console.log(`  ${teacherCount >= 1 ? '✅' : '❌'} At least 1 teacher (found: ${teacherCount})`);
    console.log(`  ${studentCount >= 1 ? '✅' : '❌'} At least 1 student (found: ${studentCount})`);
    
    // Check applications (pending signups)
    const appCount = await applicationsCollection.countDocuments();
    console.log(`\n📋 Pending Applications: ${appCount}`);
    
    if (appCount > 0) {
      const apps = await applicationsCollection
        .find({}, { projection: { username: 1, type: 1, _id: 0 } })
        .toArray();
      console.log('Pending:');
      console.table(apps);
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProfiles();
