/**
 * MongoDB Index Verification Script
 * Verifies that all performance indexes are created for teacher overview optimization
 */
require('dotenv').config();
const mongoose = require('mongoose');

const collections = [
  { name: 'tasks', expectedIndexes: ['createdByUserId_1', 'schoolId_1'] },
  { name: 'assignments', expectedIndexes: ['createdByUserId_1', 'schoolId_1', 'visibility_1'] },
  { name: 'quizzes', expectedIndexes: ['createdByUserId_1', 'schoolId_1', 'createdAt_1', 'visibility_1'] },
  { name: 'announcements', expectedIndexes: ['createdByUserId_1', 'schoolId_1'] },
  { name: 'videos', expectedIndexes: ['uploadedBy_1'] },
  { name: 'submissions', expectedIndexes: ['taskId_1_status_1', 'studentUserId_1_status_1', 'studentUserId_1', 'taskId_1', 'status_1'] },
  { name: 'profiles', expectedIndexes: ['schoolId_1_role_1', 'schoolId_1'] }
];

async function verifyIndexes() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('\n✅ Connected to MongoDB\n');
    console.log('📊 TEACHER OVERVIEW PERFORMANCE INDEX VERIFICATION\n');
    console.log('='.repeat(70));

    const db = mongoose.connection.db;

    for (const { name, expectedIndexes } of collections) {
      try {
        const indexes = await db.collection(name).getIndexes();
        const indexNames = Object.keys(indexes);

        console.log(`\n📋 Collection: ${name}`);
        console.log(`   Total indexes: ${indexNames.length}`);

        // Check for performance indexes
        let performanceIndexesFound = 0;
        for (const expected of expectedIndexes) {
          const found = indexNames.includes(expected);
          if (found) {
            performanceIndexesFound++;
            console.log(`   ✅ ${expected}`);
          } else {
            console.log(`   ⚠️  ${expected} (NOT FOUND)`);
          }
        }

        console.log(`   Performance indexes: ${performanceIndexesFound}/${expectedIndexes.length}`);

        // Show all indexes
        console.log(`   All indexes: ${indexNames.map(n => n !== '_id_' ? n : '(primary)').join(', ')}`);
      } catch (err) {
        console.log(`\n❌ Collection: ${name} - NOT FOUND OR ERROR`);
        console.log(`   Error: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✨ INDEX VERIFICATION COMPLETE\n');
    console.log('Performance Impact:');
    console.log('- Indexed countDocuments() queries: ~1-5ms (indexed lookup)');
    console.log('- Target response time for /api/teacher/overview: <100ms');
    console.log('- Query execution: Parallel Promise.all() with 7 count operations\n');

    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected\n');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exitCode = 1;
  }
}

verifyIndexes();
