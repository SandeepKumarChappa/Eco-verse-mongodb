import mongoose from 'mongoose';
import { Assignment } from './server/models/Assignment';
import { AssignmentSubmission } from './server/models/AssignmentSubmission';
import { User } from './server/models/User';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/ecoverse');
  const user = await User.findOne({ username: 'cut' }).lean();
  console.log('user', user?.id);
  const assignments = await Assignment.find({ createdByUserId: user?.id }).select('id').lean();
  console.log('assignments', assignments.map(a => a.id));
  const pending = await AssignmentSubmission.countDocuments({ assignmentId: { $in: assignments.map(a => String(a.id)) }, status: 'submitted' });
  console.log('assignment pending', pending);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});