const { MongoClient } = require('mongodb');

async function checkMissingSchools() {
  const client = new MongoClient('mongodb://localhost:27017/ecoverse');
  await client.connect();
  const db = client.db('ecoverse');

  const missingSchoolIds = ['31814de4-4ec2-4e6c-896f-00d5cc2851cf', 'test-school'];

  // Check if these school IDs exist
  const schools = await db.collection('schools').find({
    id: { $in: missingSchoolIds }
  }).toArray();
  console.log('Found schools for missing IDs:', schools);

  // Check teacher profiles for these schoolIds
  const profiles = await db.collection('profiles').find({
    role: 'teacher',
    schoolId: { $in: missingSchoolIds }
  }).toArray();
  console.log('Teacher profiles with these schoolIds:', profiles.length);
  profiles.forEach(p => console.log('  Profile:', p.id, p.name, 'schoolId:', p.schoolId));

  // Check applications
  const apps = await db.collection('applications').find({
    role: 'teacher',
    status: 'approved',
    schoolId: { $in: missingSchoolIds }
  }).toArray();
  console.log('Approved applications with these schoolIds:', apps.length);
  apps.forEach(a => console.log('  App:', a.username, a.name, 'schoolId:', a.schoolId));

  // Check tasks
  const tasks = await db.collection('tasks').find({
    createdByUserId: { $exists: true }
  }).toArray();
  console.log('Total tasks:', tasks.length);

  const tasksWithMissingSchools = tasks.filter(t =>
    missingSchoolIds.includes(t.schoolId) ||
    (t.createdByUserId && missingSchoolIds.some(id => t.createdByUserId.includes(id)))
  );
  console.log('Tasks with missing school associations:', tasksWithMissingSchools.length);
  tasksWithMissingSchools.slice(0, 3).forEach(t => console.log('  Task:', t.id, 'by:', t.createdByUserId, 'schoolId:', t.schoolId));

  await client.close();
}

checkMissingSchools().catch(console.error);