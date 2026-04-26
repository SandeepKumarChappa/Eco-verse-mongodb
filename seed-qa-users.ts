import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './server/models/User';
import { Profile } from './server/models/Profile';
import { School } from './server/models/School';
import bcrypt from 'bcrypt';

async function seedQAUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Ensure test school exists
    let school = await School.findOne({ name: 'Test School' });
    if (!school) {
      school = await School.create({
        id: 'school-1',
        name: 'Test School',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country',
        phone: '555-1234',
        email: 'test@school.com'
      });
      console.log('Created test school');
    }

    // Create QA teacher
    let teacherUser = await User.findOne({ username: 'qa_teacher' });
    if (!teacherUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      teacherUser = await User.create({
        id: 'qa-teacher-' + Date.now(),
        username: 'qa_teacher',
        password: hashedPassword
      });
      console.log('Created qa_teacher user');
    }

    let teacherProfile = await Profile.findOne({ id: teacherUser.id });
    if (!teacherProfile) {
      teacherProfile = await Profile.create({
        id: teacherUser.id,
        role: 'teacher',
        name: 'QA Teacher',
        email: 'qa_teacher@example.com',
        schoolId: school.id,
        subject: 'Computer Science'
      });
      console.log('Created qa_teacher profile');
    }

    // Create QA student
    let studentUser = await User.findOne({ username: 'qa_student' });
    if (!studentUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      studentUser = await User.create({
        id: 'qa-student-' + Date.now(),
        username: 'qa_student',
        password: hashedPassword
      });
      console.log('Created qa_student user');
    }

    let studentProfile = await Profile.findOne({ id: studentUser.id });
    if (!studentProfile) {
      studentProfile = await Profile.create({
        id: studentUser.id,
        role: 'student',
        name: 'QA Student',
        email: 'qa_student@example.com',
        schoolId: school.id,
        className: '10A',
        section: 'A'
      });
      console.log('Created qa_student profile');
    }

    console.log('QA users seeded successfully');

  } catch (err) {
    console.error('Error seeding QA users:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedQAUsers();