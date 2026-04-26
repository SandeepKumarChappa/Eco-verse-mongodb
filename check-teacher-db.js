import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from './server/models/User';
import { Profile } from './server/models/Profile';
import { Application } from './server/models/Application';

async function checkTeacherAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Check all users
    const users = await User.find({}).lean();
    console.log(`\nFound ${users.length} users:`);
    for (const user of users) {
      console.log(`- ${user.username} (id: ${user.id})`);
    }

    // Check all profiles
    const profiles = await Profile.find({}).lean();
    console.log(`\nFound ${profiles.length} profiles:`);
    for (const profile of profiles) {
      console.log(`- ${profile.id}: role=${profile.role}, name=${profile.name}, schoolId=${profile.schoolId}`);
    }

    // Check pending applications
    const apps = await Application.find({}).lean();
    console.log(`\nFound ${apps.length} applications:`);
    for (const app of apps) {
      console.log(`- ${app.username}: role=${app.role}, status=${app.status}`);
    }

    // Check for qa_teacher specifically
    const qaTeacherUser = await User.findOne({ username: 'qa_teacher' }).lean();
    if (qaTeacherUser) {
      console.log(`\nqa_teacher user found: id=${qaTeacherUser.id}`);
      const qaTeacherProfile = await Profile.findOne({ id: qaTeacherUser.id }).lean();
      if (qaTeacherProfile) {
        console.log(`qa_teacher profile: role=${qaTeacherProfile.role}, schoolId=${qaTeacherProfile.schoolId}`);
      } else {
        console.log('qa_teacher profile NOT FOUND - this is the bug!');
      }
    } else {
      console.log('\nqa_teacher user NOT FOUND');
    }

    // Check for qa_student
    const qaStudentUser = await User.findOne({ username: 'qa_student' }).lean();
    if (qaStudentUser) {
      console.log(`\nqa_student user found: id=${qaStudentUser.id}`);
      const qaStudentProfile = await Profile.findOne({ id: qaStudentUser.id }).lean();
      if (qaStudentProfile) {
        console.log(`qa_student profile: role=${qaStudentProfile.role}, schoolId=${qaStudentProfile.schoolId}`);
      } else {
        console.log('qa_student profile NOT FOUND');
      }
    } else {
      console.log('\nqa_student user NOT FOUND');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkTeacherAccounts();