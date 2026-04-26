import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

async function checkUserStructure() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Get sample documents
    const sampleUsers = await usersCollection.find({}).limit(3).toArray();
    
    console.log('📄 Sample User Documents:\n');
    sampleUsers.forEach((user, idx) => {
      console.log(`User ${idx + 1}:`);
      console.log(JSON.stringify(user, null, 2));
      console.log('---\n');
    });
    
    // Check for admin user
    const adminUser = await usersCollection.findOne({ username: 'admin123' });
    console.log('\n🔐 Admin User (admin123):');
    console.log(JSON.stringify(adminUser, null, 2));
    
    // List all collections
    console.log('\n📦 All Collections:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUserStructure();
