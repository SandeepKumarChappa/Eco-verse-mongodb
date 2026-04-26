const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function checkData() {
  const client = new MongoClient('mongodb://localhost:27017/ecoverse');
  await client.connect();
  const db = client.db('ecoverse');

  console.log('=== SCHOOLS ===');
  const schools = await db.collection('schools').find({}).toArray();
  console.log('Total schools:', schools.length);
  schools.forEach(s => console.log('  ', s.id, '->', s.name));

  console.log('\n=== TEACHER PROFILES ===');
  const profiles = await db.collection('profiles').find({ role: 'teacher' }).toArray();
  console.log('Total teacher profiles:', profiles.length);
  profiles.forEach(p => console.log('  ', p.id, '@' + (p.name || 'unnamed'), 'schoolId:', p.schoolId || 'none'));

  console.log('\n=== APPROVED TEACHER APPLICATIONS ===');
  const apps = await db.collection('applications').find({ role: 'teacher', status: 'approved' }).toArray();
  console.log('Total approved teacher apps:', apps.length);
  apps.forEach(a => console.log('  ', a.username, 'schoolId:', a.schoolId || 'none'));

  console.log('\n=== TASKS ===');
  const tasks = await db.collection('tasks').find({}).toArray();
  console.log('Total tasks:', tasks.length);
  const teacherTasks = tasks.filter(t => t.createdByUserId);
  console.log('Tasks with teacher:', teacherTasks.length);
  teacherTasks.slice(0, 5).forEach(t => console.log('  ', t.id, 'by', t.createdByUserId, 'school:', t.schoolId));

  // Create QA accounts if they don't exist
  console.log('\n=== CREATING QA ACCOUNTS ===');

  // Ensure test school exists
  let school = await db.collection('schools').findOne({ name: 'Test School' });
  if (!school) {
    school = {
      id: 'school-1',
      name: 'Test School',
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
      phone: '555-1234',
      email: 'test@school.com'
    };
    await db.collection('schools').insertOne(school);
    console.log('Created test school');
  }

  // Create QA teacher
  let teacherUser = await db.collection('users').findOne({ username: 'qa_teacher' });
  if (!teacherUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    teacherUser = {
      id: 'qa-teacher-' + Date.now(),
      username: 'qa_teacher',
      password: hashedPassword
    };
    await db.collection('users').insertOne(teacherUser);
    console.log('Created qa_teacher user');
  }

  let teacherProfile = await db.collection('profiles').findOne({ id: teacherUser.id });
  if (!teacherProfile) {
    teacherProfile = {
      id: teacherUser.id,
      role: 'teacher',
      name: 'QA Teacher',
      email: 'qa_teacher@example.com',
      schoolId: school.id,
      subject: 'Computer Science'
    };
    await db.collection('profiles').insertOne(teacherProfile);
    console.log('Created qa_teacher profile');
  }

  // Create QA student
  let studentUser = await db.collection('users').findOne({ username: 'qa_student' });
  if (!studentUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    studentUser = {
      id: 'qa-student-' + Date.now(),
      username: 'qa_student',
      password: hashedPassword
    };
    await db.collection('users').insertOne(studentUser);
    console.log('Created qa_student user');
  }

  let studentProfile = await db.collection('profiles').findOne({ id: studentUser.id });
  if (!studentProfile) {
    studentProfile = {
      id: studentUser.id,
      role: 'student',
      name: 'QA Student',
      email: 'qa_student@example.com',
      schoolId: school.id,
      className: '10A',
      section: 'A'
    };
    await db.collection('profiles').insertOne(studentProfile);
    console.log('Created qa_student profile');
  }

  console.log('QA accounts created successfully');

  await client.close();
}

checkData().catch(console.error);