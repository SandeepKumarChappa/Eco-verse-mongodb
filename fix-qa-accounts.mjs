import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from './server/models/User.js';
import { Profile } from './server/models/Profile.js';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const qaTeacherUser = await User.findOne({ username: 'qa_teacher' }).lean();
    if (qaTeacherUser) {
      console.log(`qa_teacher user found: id=${qaTeacherUser.id}`);
      const qaTeacherProfile = await Profile.findOne({ id: qaTeacherUser.id }).lean();
      if (qaTeacherProfile) {
        console.log(`qa_teacher profile: role=${qaTeacherProfile.role}, schoolId=${qaTeacherProfile.schoolId}`);
      } else {
        console.log('qa_teacher profile NOT FOUND - creating one...');
        await Profile.create({
          id: qaTeacherUser.id,
          role: 'teacher',
          name: 'QA Teacher',
          schoolId: 'school-1',
          email: 'qa_teacher@example.com'
        });
        console.log('Created qa_teacher profile');
      }
    } else {
      console.log('qa_teacher user NOT FOUND - creating user and profile...');
      const userId = 'qa-teacher-' + Date.now();
      await User.create({
        id: userId,
        username: 'qa_teacher',
        password: '$2b$10$dummy.hash.for.qa' // dummy hash
      });
      await Profile.create({
        id: userId,
        role: 'teacher',
        name: 'QA Teacher',
        schoolId: 'school-1',
        email: 'qa_teacher@example.com'
      });
      console.log('Created qa_teacher user and profile');
    }

    const qaStudentUser = await User.findOne({ username: 'qa_student' }).lean();
    if (qaStudentUser) {
      console.log(`qa_student user found: id=${qaStudentUser.id}`);
      const qaStudentProfile = await Profile.findOne({ id: qaStudentUser.id }).lean();
      if (qaStudentProfile) {
        console.log(`qa_student profile: role=${qaStudentProfile.role}, schoolId=${qaStudentProfile.schoolId}`);
      } else {
        console.log('qa_student profile NOT FOUND - creating one...');
        await Profile.create({
          id: qaStudentUser.id,
          role: 'student',
          name: 'QA Student',
          schoolId: 'school-1',
          email: 'qa_student@example.com',
          className: '10A',
          section: 'A'
        });
        console.log('Created qa_student profile');
      }
    } else {
      console.log('qa_student user NOT FOUND - creating user and profile...');
      const userId = 'qa-student-' + Date.now();
      await User.create({
        id: userId,
        username: 'qa_student',
        password: '$2b$10$dummy.hash.for.qa' // dummy hash
      });
      await Profile.create({
        id: userId,
        role: 'student',
        name: 'QA Student',
        schoolId: 'school-1',
        email: 'qa_student@example.com',
        className: '10A',
        section: 'A'
      });
      console.log('Created qa_student user and profile');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();