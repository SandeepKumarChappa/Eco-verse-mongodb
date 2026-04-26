import { User } from './models/User';
import { Task } from './models/Task';
import { Announcement } from './models/Announcement';
import { Profile } from './models/Profile';
import { Submission } from './models/Submission';
import { School } from './models/School';
import { Quiz as QuizModel } from './models/Quiz';
import { QuizAttempt as QuizAttemptModel } from './models/QuizAttempt';
import { Assignment } from './models/Assignment';
import { AssignmentSubmission } from './models/AssignmentSubmission';
import { Application } from './models/Application';
import { Game } from './models/Game';
import { GamePlay } from './models/GamePlay';
import { LearningModule } from './models/LearningModule';
import { LessonCompletion } from './models/LessonCompletion';
import { Notification } from './models/Notification';
import { Video } from './models/Video';
import { UserVideoProgress } from './models/UserVideoProgress';
import { UserCredits } from './models/UserCredits';
import { TaskGroup } from './models/TaskGroup';
import { randomUUID } from 'crypto';
import type { User as UserType } from '@shared/schema';
import type {
  ProfilePayload,
  ProfileUpsert,
  TaskSubmission,
  Quiz,
  QuizAttempt
} from './storage';

type TaskType = any;
type AnnouncementType = any;

/**
 * Standalone MongoDB storage implementation for core entities.
 * This class handles CRUD operations using Mongoose models.
 */
export class MongoStorage {
  // ===== User Methods =====
  async getUser(id: string): Promise<UserType | undefined> {
    const user = await User.findOne({ id }).lean();
    return user ? (user as unknown as UserType) : undefined;
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    const user = await User.findOne({ username }).lean();
    return user ? (user as unknown as UserType) : undefined;
  }

  async getAllStudents(): Promise<Array<{ id: string; username: string; schoolId?: string }>> {
    const profiles = await Profile.find({ role: 'student' }).lean();
    const students = [];
    for (const profile of profiles) {
      const user = await User.findOne({ id: profile.id }).lean();
      if (user) {
        students.push({ id: user.id, username: user.username, schoolId: profile.schoolId });
      }
    }
    return students;
  }

  async createUser(userInput: any): Promise<UserType> {
    const user = await User.create(userInput);
    // Create an empty profile for the user
    await Profile.create({
      id: userInput.id,
      role: userInput.role || 'student',
      name: userInput.username,
      schoolId: userInput.schoolId || '',
    });
    return user.toObject() as unknown as UserType;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const count = await User.countDocuments({ username });
    return count === 0;
  }

  // ===== Profile Methods =====
  async getOwnProfile(username: string): Promise<ProfilePayload | null> {
    const user = await User.findOne({ username }).lean();
    if (!user) return null;
    
    const profile = await Profile.findOne({ id: user.id }).lean();
    if (!profile) return null;

    return {
      username: (user as any).username,
      role: (profile as any).role,
      name: (profile as any).name,
      email: (profile as any).email || '',
      schoolId: (profile as any).schoolId || '',
      photoDataUrl: (profile as any).photoDataUrl,
      studentId: (profile as any).studentId,
      rollNumber: (profile as any).rollNumber,
      className: (profile as any).className,
      section: (profile as any).section,
      teacherId: (profile as any).teacherId,
      subject: (profile as any).subject,
      allowExternalView: (profile as any).allowExternalView || false,
    } as ProfilePayload;
  }

  async getProfileById(userId: string): Promise<ProfilePayload | null> {
    const profile = await Profile.findOne({ id: userId }).lean();
    if (!profile) return null;

    const user = await User.findOne({ id: userId }).lean();
    if (!user) return null;

    return {
      username: (user as any).username,
      role: (profile as any).role,
      name: (profile as any).name,
      email: (profile as any).email || '',
      schoolId: (profile as any).schoolId || '',
      photoDataUrl: (profile as any).photoDataUrl,
      studentId: (profile as any).studentId,
      rollNumber: (profile as any).rollNumber,
      className: (profile as any).className,
      section: (profile as any).section,
      teacherId: (profile as any).teacherId,
      subject: (profile as any).subject,
    } as ProfilePayload;
  }

  async updateOwnProfile(username: string, updates: Partial<ProfileUpsert>): Promise<{ ok: true; profile: ProfilePayload } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username }).lean();
      if (!user) return { ok: false, error: 'User not found' };

      const normalizedUpdates: any = { ...(updates || {}) };
      if (!normalizedUpdates.role) {
        if (normalizedUpdates.teacherId || normalizedUpdates.subject) normalizedUpdates.role = 'teacher';
        else if (normalizedUpdates.studentId || normalizedUpdates.className || normalizedUpdates.rollNumber || normalizedUpdates.section) normalizedUpdates.role = 'student';
        else normalizedUpdates.role = 'teacher';
      }
      if (!normalizedUpdates.name) normalizedUpdates.name = (user as any).username;
      if (typeof normalizedUpdates.email !== 'string') normalizedUpdates.email = '';

      await Profile.findOneAndUpdate(
        { id: (user as any).id },
        {
          $set: normalizedUpdates,
          $setOnInsert: {
            id: (user as any).id,
          },
        },
        { upsert: true, returnDocument: 'after' }
      ).lean();

      const payload = await this.getOwnProfile(username);
      return { ok: true, profile: payload! };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async upsertProfile(userId: string, profileData: any): Promise<any> {
    try {
      const updated = await Profile.findOneAndUpdate(
        { id: userId },
        { $set: profileData },
        { upsert: true, new: true }
      ).lean();
      return updated;
    } catch (err: any) {
      console.error('❌ Error upserting profile:', err);
      throw err;
    }
  }

  // ===== Task Methods =====
  async createTask(teacherUsername: string, input: any): Promise<{ ok: true; task: TaskType } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username: teacherUsername }).lean();
      if (!user) return { ok: false, error: 'Teacher not found' };
      
      const taskData = {
        ...input,
        createdByUserId: (user as any).id,
        createdAt: Date.now(),
      };
      
      console.log(`MongoDB: Creating task for school ${input.schoolId}, teacher ${user.id}`);
      
      const task = await Task.create(taskData);
      return { ok: true, task: task.toObject() as unknown as TaskType };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getTaskById(taskId: string): Promise<TaskType | null> {
    const task = await Task.findOne({ id: taskId }).lean();
    return task ? (task as unknown as TaskType) : null;
  }

  async listTeacherTasks(teacherUsername: string): Promise<TaskType[]> {
    console.log("MongoDB: fetching teacher tasks for", teacherUsername);
    const teacherId = await this.resolveUserId(teacherUsername);
    const query = { createdByUserId: teacherId ?? teacherUsername };
    const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
    return tasks as unknown as TaskType[];
  }

  async listStudentTasks(studentUsername: string): Promise<Array<{ task: TaskType; submission?: TaskSubmission }>> {
    console.log("MongoDB: fetching student tasks for", studentUsername);

    const user = await User.findOne({ username: studentUsername });
    if (!user) return [];

    const profile = await Profile.findOne({ id: (user as any).id });
    if (!profile) return [];

    const schoolId = (profile as any).schoolId;
    if (!schoolId) {
      console.warn("MongoDB: Student profile has no schoolId", studentUsername);
      return [];
    }

    const tasks = await Task.find({ schoolId }).sort({ createdAt: -1 }).lean();
    
    return await Promise.all(tasks.map(async (t: any) => {
      const submission = await Submission.findOne({ 
        taskId: t.id, 
        studentUserId: (user as any).id 
      }).lean();
      
      return {
        task: t as unknown as TaskType,
        submission: submission ? (submission as unknown as TaskSubmission) : undefined,
      };
    }));
  }

  private async resolveUserId(usernameOrId: string): Promise<string | null> {
    const byId = await User.findOne({ id: usernameOrId }).select('id').lean();
    if (byId) return (byId as any).id;

    const byUsername = await User.findOne({ username: usernameOrId }).select('id').lean();
    return byUsername ? (byUsername as any).id : null;
  }

  private async getTeacherSchoolId(teacherUsername: string): Promise<string | null> {
    const teacherId = await this.resolveUserId(teacherUsername);
    if (!teacherId) return null;

    const profile = await Profile.findOne({ id: teacherId, role: 'teacher' }).select('schoolId').lean();
    return profile ? (profile as any).schoolId : null;
  }

  // ===== Count-only Methods (for Overview) =====
  async countTeacherTasks(teacherUsername: string): Promise<number> {
    const creatorId = await this.resolveUserId(teacherUsername);
    return await Task.countDocuments({ createdByUserId: creatorId ?? teacherUsername });
  }

  async countAssignmentsByTeacher(teacherUsername: string): Promise<number> {
    const creatorId = await this.resolveUserId(teacherUsername);
    return await Assignment.countDocuments({ createdByUserId: creatorId ?? teacherUsername });
  }

  async countQuizzesByTeacher(teacherUsername: string): Promise<number> {
    const creatorId = await this.resolveUserId(teacherUsername);
    return await QuizModel.countDocuments({ createdByUserId: creatorId ?? teacherUsername });
  }

  async countAnnouncementsForTeacher(teacherUsername: string): Promise<number> {
    const creatorId = await this.resolveUserId(teacherUsername);
    return await Announcement.countDocuments({ createdByUserId: creatorId ?? teacherUsername });
  }

  async countVideosByUploader(uploadedBy: string): Promise<number> {
    const uploaderId = await this.resolveUserId(uploadedBy);
    return await Video.countDocuments({ uploadedBy: uploaderId ?? uploadedBy });
  }

  async countPendingSubmissionsForTeacher(teacherUsername: string): Promise<number> {
    const creatorId = await this.resolveUserId(teacherUsername);
    const creatorKey = creatorId ?? teacherUsername;

    const teacherTaskIds = await Task.find({ createdByUserId: creatorKey }).select('id').lean();
    const taskIds = teacherTaskIds.map((task: any) => String(task.id));

    const taskPending = taskIds.length > 0
      ? await Submission.countDocuments({ taskId: { $in: taskIds }, status: 'submitted' })
      : 0;

    const teacherAssignmentIds = await Assignment.find({ createdByUserId: creatorKey }).select('id').lean();
    const assignmentIds = teacherAssignmentIds.map((assignment: any) => String(assignment.id));

    const assignmentPending = assignmentIds.length > 0
      ? await AssignmentSubmission.countDocuments({ assignmentId: { $in: assignmentIds }, status: { $in: ['submitted'] } })
      : 0;

    return taskPending + assignmentPending;
  }

  async countStudentsForTeacher(teacherUsername: string): Promise<number> {
    const schoolId = await this.getTeacherSchoolId(teacherUsername);
    if (!schoolId) return 0;

    return await Profile.countDocuments({ role: 'student', schoolId });
  }

  // ===== Submission Methods =====
  async submitTask(studentUsername: string, taskId: string, photoDataUrlOrList: string | string[]): Promise<{ ok: true; submission: TaskSubmission } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username: studentUsername }).lean();
      if (!user) return { ok: false, error: 'Student not found' };

      const photos = Array.isArray(photoDataUrlOrList) ? photoDataUrlOrList : [photoDataUrlOrList];
      
      const submission = await Submission.create({
        id: randomUUID(),
        taskId,
        studentUserId: (user as any).id,
        photos,
        photoDataUrl: photos[0],
        submittedAt: Date.now(),
        status: 'submitted',
      });

      return { ok: true, submission: submission.toObject() as unknown as TaskSubmission };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async listSubmissionsForTeacher(teacherUsername: string, taskId?: string): Promise<any[]> {
    const creatorId = await this.resolveUserId(teacherUsername);
    if (!creatorId && !teacherUsername) return [];

    console.log("SUBMISSIONS FLOW:", { teacherUsername, taskId });
    
    const query: any = {};
    if (taskId) {
      query.taskId = taskId;
    } else {
      // Find all tasks created by this teacher
      const teacherQuery = { createdByUserId: creatorId ?? teacherUsername };
      const teacherTasks = await Task.find(teacherQuery).select('id').lean();
      const taskIds = teacherTasks.map((t: any) => String(t.id));
      if (taskIds.length === 0) return []; // Null safety: If no tasks, return []
      query.taskId = { $in: taskIds };
    }

    const submissions = await Submission.find(query).select('id taskId studentUserId photoDataUrl photos submittedAt status points feedback reviewedByUserId reviewedAt groupId').sort({ submittedAt: -1 }).lean();
    if (!submissions || submissions.length === 0) return [];
    
    // Enrich with student details (this is normally done in the storage driver)
    const enriched = await Promise.all(submissions.map(async (s: any) => {
      const student = await User.findOne({ id: s.studentUserId }).lean();
      const profile = await Profile.findOne({ id: s.studentUserId }).lean();
      const task = await Task.findOne({ id: s.taskId }).lean();
      
      return {
        ...s,
        studentUsername: (student as any)?.username || 'student',
        studentName: (profile as any)?.name,
        className: (profile as any)?.className,
        section: (profile as any)?.section,
        taskTitle: (task as any)?.title,
        taskMaxPoints: (task as any)?.maxPoints,
      };
    }));

    return enriched;
  }

  async reviewSubmission(teacherUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const update: any = {
        status: decision.status,
        points: decision.points || 0,
        feedback: decision.feedback,
        reviewedAt: Date.now(),
      };

      const res = await Submission.findOneAndUpdate({ id: submissionId }, { $set: update });
      if (!res) return { ok: false, error: 'Submission not found' };
      
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getStudentSubmissionStats(studentUsername: string): Promise<{ ecoPoints: number; timeline: any[] }> {
    const user = await User.findOne({ username: studentUsername }).lean();
    if (!user) return { ecoPoints: 0, timeline: [] };

    const submissions = await Submission.find({
      studentUserId: (user as any).id,
      status: 'approved',
    })
      .select({ taskId: 1, points: 1, reviewedAt: 1, submittedAt: 1, photoDataUrl: 1 })
      .sort({ submittedAt: -1 })
      .lean();

    if (!submissions.length) return { ecoPoints: 0, timeline: [] };

    const taskIds = Array.from(new Set(submissions.map((s: any) => String(s.taskId || '')).filter(Boolean)));
    const tasks = taskIds.length
      ? await Task.find({ id: { $in: taskIds } }).select({ id: 1, title: 1 }).lean()
      : [];
    const taskById = new Map<string, string>(
      (tasks as any[]).map((t: any) => [String(t.id), String(t.title || 'Task')])
    );

    let ecoPoints = 0;
    const timeline = submissions.map((s: any) => {
      ecoPoints += Number(s.points || 0);
      return {
        kind: 'task',
        when: s.reviewedAt || s.submittedAt,
        title: taskById.get(String(s.taskId || '')) || 'Task',
        photoDataUrl: s.photoDataUrl,
        points: s.points,
      };
    });

    return { ecoPoints, timeline };
  }

  // ===== Assignment Methods =====
  async createAssignment(data: any): Promise<{ ok: true; assignment: any } | { ok: false; error: string }> {
    try {
      console.log('MONGO HIT: createAssignment');
      const assignment = await Assignment.create(data);
      return { ok: true, assignment: assignment.toObject() };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getAssignmentById(assignmentId: string): Promise<any | null> {
    const assignment = await Assignment.findOne({ id: assignmentId }).lean();
    return assignment || null;
  }

  async listAssignmentsByTeacher(teacherUsername: string): Promise<any[]> {
    console.log(`[MongoDB] Fetching teacher assignments for ${teacherUsername}`);
    const creatorId = await this.resolveUserId(teacherUsername);
    const query = { createdByUserId: creatorId ?? teacherUsername };
    console.log('Creator key:', creatorId ?? teacherUsername);
    const assignments = await Assignment.find(query).sort({ createdAt: -1 }).lean();
    console.log('Assignments found:', assignments.length);
    return assignments;
  }

  async listAssignmentsByCreatorId(creatorId: string): Promise<any[]> {
    console.log(`[MongoDB] Fetching teacher assignments for creatorId ${creatorId}`);
    const assignments = await Assignment.find({ createdByUserId: creatorId }).sort({ createdAt: -1 }).lean();
    console.log('Teacher ID:', creatorId);
    console.log('Assignments found:', assignments.length);
    return assignments;
  }

  async listAssignmentsForStudent(studentUsername: string): Promise<Array<{ assignment: any; submission?: any }>> {
    console.log(`[MongoDB] Fetching student assignments for ${studentUsername}`);
    const user = await User.findOne({ username: studentUsername });
    if (!user) return [];

    const profile = await Profile.findOne({ id: (user as any).id });
    if (!profile) return [];

    const schoolId = (profile as any).schoolId;
    if (!schoolId) {
      console.warn(`[MongoDB] Student profile has no schoolId: ${studentUsername}`);
      return [];
    }

    // Get assignments for student's school (both school-scoped and global)
    const assignments = await Assignment.find({
      $or: [
        { schoolId: schoolId, visibility: 'school' },
        { visibility: 'global' }
      ]
    }).sort({ createdAt: -1 }).lean();
    
    return await Promise.all(assignments.map(async (a: any) => {
      const submission = await AssignmentSubmission.findOne({ 
        assignmentId: a.id, 
        studentUserId: (user as any).id 
      }).lean();
      
      return {
        assignment: a,
        submission: submission || undefined,
      };
    }));
  }

  async submitAssignment(studentUsername: string, assignmentId: string, files: string[]): Promise<{ ok: true; submission: any } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username: studentUsername }).lean();
      if (!user) return { ok: false, error: 'Student not found' };

      const normalizedFiles = Array.isArray(files) ? files.filter((f) => typeof f === 'string' && f.trim()) : [];
      if (normalizedFiles.length === 0) return { ok: false, error: 'No valid files provided' };

      const submission = await AssignmentSubmission.create({
        id: randomUUID(),
        assignmentId,
        studentUserId: (user as any).id,
        files: normalizedFiles,
        // Keep a text mirror for backward compatibility with older readers.
        submissionText: normalizedFiles.join('\n'),
        submittedAt: Date.now(),
        status: 'submitted',
      });

      return { ok: true, submission: submission.toObject() };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async listSubmissionsByAssignment(assignmentId: string): Promise<any[]> {
    const query = assignmentId ? { assignmentId } : {};
    const submissions = await AssignmentSubmission.find(query).sort({ submittedAt: -1 }).lean();
    
    // Enrich with student details
    const enriched = await Promise.all(submissions.map(async (s: any) => {
      const student = await User.findOne({ id: s.studentUserId }).lean();
      const profile = await Profile.findOne({ id: s.studentUserId }).lean();
      const assignment = await Assignment.findOne({ id: s.assignmentId }).lean();
      const files = Array.isArray((s as any).files) && (s as any).files.length > 0
        ? (s as any).files
        : (typeof (s as any).submissionText === 'string'
            ? (s as any).submissionText.split('\n').filter((v: string) => !!v && v.startsWith('data:'))
            : []);
      
      return {
        ...s,
        files,
        studentUsername: (student as any)?.username || 'student',
        studentName: (profile as any)?.name,
        className: (profile as any)?.className,
        section: (profile as any)?.section,
        assignmentMaxPoints: (assignment as any)?.maxPoints,
      };
    }));

    return enriched;
  }

  async listAssignmentSubmissionsForTeacher(teacherUsername: string, assignmentId?: string): Promise<any[]> {
    const user = await User.findOne({ username: teacherUsername }).lean();
    if (!user) return [];

    console.log("SUBMISSIONS FLOW:", { teacherUsername, assignmentId });

    let query: any = {};
    if (assignmentId) {
      query.assignmentId = assignmentId;
    } else {
      const teacherAssignments = await Assignment.find({ createdByUserId: (user as any).id }).lean();
      const assignmentIds = teacherAssignments.map((a: any) => String(a.id));
      if (assignmentIds.length === 0) return []; // Null safety: If no assignments, return []
      query.assignmentId = { $in: assignmentIds };
    }

    const submissions = await AssignmentSubmission.find(query).sort({ submittedAt: -1 }).lean();
    if (!submissions || submissions.length === 0) return [];

    // Enrich with student details
    const enriched = await Promise.all(submissions.map(async (s: any) => {
      const student = await User.findOne({ id: s.studentUserId }).lean();
      const profile = await Profile.findOne({ id: s.studentUserId }).lean();
      const assignment = await Assignment.findOne({ id: s.assignmentId }).lean();
      const files = Array.isArray((s as any).files) && (s as any).files.length > 0
        ? (s as any).files
        : (typeof (s as any).submissionText === 'string'
            ? (s as any).submissionText.split('\n').filter((v: string) => !!v && v.startsWith('data:'))
            : []);
      
      return {
        ...s,
        files,
        studentUsername: (student as any)?.username || 'student',
        studentName: (profile as any)?.name,
        className: (profile as any)?.className,
        section: (profile as any)?.section,
        assignmentMaxPoints: (assignment as any)?.maxPoints,
      };
    }));

    return enriched;
  }

  async listAllAssignmentSubmissions(): Promise<any[]> {
    const submissions = await AssignmentSubmission.find({}).sort({ submittedAt: -1 }).lean();
    return submissions.map((s: any) => {
      const files = Array.isArray(s.files) && s.files.length > 0
        ? s.files
        : (typeof s.submissionText === 'string'
            ? s.submissionText.split('\n').filter((v: string) => !!v && v.startsWith('data:'))
            : []);
      return { ...s, files };
    });
  }

  async reviewAssignmentSubmission(submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const update: any = {
        status: decision.status,
        points: decision.points || 0,
        feedback: decision.feedback,
        reviewedAt: Date.now(),
      };

      const res = await AssignmentSubmission.findOneAndUpdate({ id: submissionId }, { $set: update });
      if (!res) return { ok: false, error: 'Submission not found' };
      
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async listAssignmentSubmissionsPaginated(assignmentId?: string, page: number = 1, limit: number = 20): Promise<{ data: Array<any>; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const match: any = {};
    if (assignmentId) {
      match.assignmentId = assignmentId;
    }

    const total = await AssignmentSubmission.countDocuments(match);

    const pipeline = [
      { $match: match },
      { $sort: { submittedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'profiles',
          localField: 'studentUserId',
          foreignField: 'id',
          as: 'profile',
          pipeline: [{ $project: { name: 1, className: 1, section: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentUserId',
          foreignField: 'id',
          as: 'student',
          pipeline: [{ $project: { username: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'assignments',
          localField: 'assignmentId',
          foreignField: 'id',
          as: 'assignment',
          pipeline: [{ $project: { title: 1 } }]
        }
      },
      {
        $project: {
          id: 1,
          assignmentId: 1,
          studentUserId: 1,
          studentUsername: { $arrayElemAt: ['$student.username', 0] },
          files: 1,
          studentName: { $ifNull: [{ $arrayElemAt: ['$profile.name', 0] }, { $arrayElemAt: ['$student.username', 0] }] },
          className: { $arrayElemAt: ['$profile.className', 0] },
          section: { $arrayElemAt: ['$profile.section', 0] },
          assignmentTitle: { $ifNull: [{ $arrayElemAt: ['$assignment.title', 0] }, 'Unknown Assignment'] },
          points: { $ifNull: ['$points', 0] },
          status: { $ifNull: ['$status', 'pending'] },
          submittedAt: { $ifNull: ['$submittedAt', 0] }
        }
      }
    ] as any;

    const data = await AssignmentSubmission.aggregate(pipeline).exec() as any;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages
    };
  }

  async listAssignmentSubmissionsForTeacherPaginated(teacherUsername: string, assignmentId?: string, page: number = 1, limit: number = 20): Promise<{ data: Array<any>; total: number; page: number; totalPages: number }> {
    const user = await User.findOne({ username: teacherUsername }).lean();
    if (!user) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    const skip = (page - 1) * limit;

    // Build match condition
    const match: any = {};
    if (assignmentId) {
      match.assignmentId = assignmentId;
    } else {
      const teacherAssignments = await Assignment.find({ createdByUserId: (user as any).id }).lean();
      const assignmentIds = teacherAssignments.map((a: any) => String(a.id));
      if (assignmentIds.length === 0) {
        return { data: [], total: 0, page, totalPages: 0 };
      }
      match.assignmentId = { $in: assignmentIds };
    }

    const total = await AssignmentSubmission.countDocuments(match);

    const pipeline = [
      { $match: match },
      { $sort: { submittedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'profiles',
          localField: 'studentUserId',
          foreignField: 'id',
          as: 'profile',
          pipeline: [{ $project: { name: 1, className: 1, section: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentUserId',
          foreignField: 'id',
          as: 'student',
          pipeline: [{ $project: { username: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'assignments',
          localField: 'assignmentId',
          foreignField: 'id',
          as: 'assignment',
          pipeline: [{ $project: { title: 1, maxPoints: 1 } }]
        }
      },
      {
        $project: {
          id: 1,
          assignmentId: 1,
          studentUserId: 1,
          studentUsername: { $arrayElemAt: ['$student.username', 0] },
          files: 1,
          studentName: { $ifNull: [{ $arrayElemAt: ['$profile.name', 0] }, { $arrayElemAt: ['$student.username', 0] }] },
          className: { $arrayElemAt: ['$profile.className', 0] },
          section: { $arrayElemAt: ['$profile.section', 0] },
          assignmentTitle: { $ifNull: [{ $arrayElemAt: ['$assignment.title', 0] }, 'Unknown Assignment'] },
          assignmentMaxPoints: { $ifNull: [{ $arrayElemAt: ['$assignment.maxPoints', 0] }, 10] },
          points: { $ifNull: ['$points', 0] },
          status: { $ifNull: ['$status', 'submitted'] },
          submittedAt: { $ifNull: ['$submittedAt', 0] }
        }
      }
    ] as any;

    const data = await AssignmentSubmission.aggregate(pipeline).exec() as any;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages
    };
  }

  // ===== Announcement Methods =====
  async createAnnouncement(teacherUsername: string, input: any): Promise<{ ok: true; announcement: AnnouncementType } | { ok: false; error: string }> {
    try {
      const visibility = input.visibility || 'school';
      const schoolId = input.schoolId || (visibility === 'global' ? 'global' : '');
      console.log(`MongoDB: Creating announcement for school ${schoolId}, teacher ${teacherUsername}`);
      const creatorId = await this.resolveUserId(teacherUsername);
      const data = {
        ...input,
        schoolId,
        createdByUserId: creatorId ?? teacherUsername,
        createdAt: Date.now(),
        visibility,
      };
      const announcement = await Announcement.create(data);
      return { ok: true, announcement: announcement.toObject() as unknown as AnnouncementType };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async listAnnouncementsForTeacher(teacherUsername: string): Promise<AnnouncementType[]> {
    const creatorId = await this.resolveUserId(teacherUsername);
    const list = await Announcement.find({ createdByUserId: creatorId ?? teacherUsername }).sort({ createdAt: -1 }).lean();
    return list as unknown as AnnouncementType[];
  }

  async createAdminAnnouncement(adminUsername: string, input: any): Promise<{ ok: true; announcement: AnnouncementType } | { ok: false; error: string }> {
    return this.createAnnouncement(adminUsername, { ...input, visibility: 'global' });
  }

  async listAdminAnnouncements(adminUsername: string): Promise<AnnouncementType[]> {
    // Admins usually see global announcements
    const list = await Announcement.find({ visibility: 'global' }).sort({ createdAt: -1 }).lean();
    return list as unknown as AnnouncementType[];
  }

  async updateAdminAnnouncement(adminUsername: string, id: string, updates: any): Promise<{ ok: true; announcement: AnnouncementType } | { ok: false; error: string }> {
    try {
      const updated = await Announcement.findOneAndUpdate({ id }, updates, { new: true }).lean();
      if (!updated) return { ok: false, error: 'Announcement not found' };
      return { ok: true, announcement: updated as unknown as AnnouncementType };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async deleteAdminAnnouncement(adminUsername: string, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await Announcement.deleteOne({ id });
      if (res.deletedCount === 0) return { ok: false, error: 'Announcement not found' };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async listStudentAnnouncements(studentUsername: string): Promise<AnnouncementType[]> {
    // Students see global announcements and their school's announcements
    const user = await User.findOne({ username: studentUsername }).lean();
    if (!user) return [];

    const profile = await Profile.findOne({ id: (user as any).id }).lean();
    const schoolId = (profile as any)?.schoolId;

    // Query: global announcements OR school-scoped announcements for this student's school
    const query: any = { visibility: 'global' };
    if (schoolId) {
      query.$or = [
        { visibility: 'global' },
        { visibility: 'school', schoolId },
      ];
      delete query.visibility;
    }

    const list = await Announcement.find(query).sort({ createdAt: -1 }).lean();
    return list as unknown as AnnouncementType[];
  }

  async getOrCreateSchoolByName(name: string) {
    const normalized = name.trim().toLowerCase();
    let school = await School.findOne({ name: normalized });

    if (!school) {
      school = await School.create({
        id: randomUUID(),
        name: normalized,
      });
      console.log(`[School] Created new school: "${normalized}" with id=${school.id}`);
    } else {
      console.log(`[School] Found existing school: "${normalized}" with id=${school.id}`);
    }

    console.log(`[School] Resolved: "${name}" -> schoolId=${school.id}`);
    return school;
  }

  async listSchools(): Promise<Array<{ id: string; name: string }>> {
    const schools = await School.find({}).sort({ name: 1 }).lean();
    return schools.map((s: any) => ({ id: String(s.id || ''), name: String(s.name || '') }));
  }

  async listStudentsBySchool(schoolId: string): Promise<Array<{ username: string; name: string; className?: string; section?: string }>> {
    console.log(`MongoDB: Listing students for school ${schoolId}`);
    const profiles = await Profile.find({ role: 'student', schoolId }).lean();
    
    const students = await Promise.all(profiles.map(async (p: any) => {
      const user = await User.findOne({ id: p.id }).lean();
      if (!user) {
        console.warn(`MongoDB: Skipping orphan student profile ${p.id} in school ${schoolId}`);
        await Profile.deleteOne({ id: p.id });
        return null;
      }
      return {
        username: (user as any).username,
        name: p.name || '',
        className: p.className,
        section: p.section,
      };
    }));

    return students.filter((student): student is { username: string; name: string; className: any; section: any } => student !== null);
  }

  // ===== Quiz Methods =====
  async createQuiz(
    creatorUsername: string,
    input: {
      title: string;
      description?: string;
      points?: number;
      questions: Array<{ text: string; options: string[]; answerIndex: number }>;
      visibility?: 'global' | 'school';
      schoolId?: string;
    },
    inMemoryUsers?: Map<string, any>
  ): Promise<{ ok: true; quiz: Quiz } | { ok: false; error: string }> {
    try {
      let user = await User.findOne({ username: creatorUsername }).lean();
      
      // Fallback: if not in Mongo, try in-memory users (for legacy admins)
      if (!user && inMemoryUsers) {
        const memUser = Array.from(inMemoryUsers.entries()).find(([, u]) => (u as any).username === creatorUsername);
        if (memUser) {
          user = { id: memUser[0], username: creatorUsername } as any;
        }
      }
      
      if (!user) return { ok: false, error: 'Creator not found' };

      const title = String(input?.title || '').trim();
      if (!title) return { ok: false, error: 'Title required' };

      const visibility = input.visibility === 'global' ? 'global' : 'school';
      let schoolId = String(input.schoolId || '').trim();
      if (visibility === 'school' && !schoolId) {
        const profile = await Profile.findOne({ id: (user as any).id }).lean();
        schoolId = String((profile as any)?.schoolId || '').trim();
      }
      if (visibility === 'school' && !schoolId) return { ok: false, error: 'Teacher not linked to a school' };

      const pointsRaw = Number(input.points ?? 3);
      const points = Math.max(1, Math.min(3, Number.isFinite(pointsRaw) ? Math.floor(pointsRaw) : 3));
      const questions = Array.isArray(input.questions)
        ? input.questions
            .map((q) => ({
              id: randomUUID(),
              text: String(q.text || '').trim(),
              options: (q.options || []).map(String).slice(0, 4),
              answerIndex: Math.max(0, Math.min(3, Number(q.answerIndex) || 0)),
            }))
            .filter((q) => q.text && q.options.length >= 2)
        : [];
      if (questions.length === 0) return { ok: false, error: 'At least one question required' };

      const quizDoc = await QuizModel.create({
        id: randomUUID(),
        title,
        description: String(input.description || ''),
        points,
        questions,
        createdByUserId: (user as any).id,
        schoolId,
        createdAt: Date.now(),
        visibility,
      });

      console.log(`[MongoStorage.createQuiz] Saved quiz: id=${quizDoc.id}, title=${title}, visibility=${visibility}, createdByUserId=${(user as any).id}`);
      return { ok: true, quiz: quizDoc.toObject() as unknown as Quiz };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async listQuizzesByTeacher(teacherUsername: string, inMemoryUsers?: Map<string, any>, inMemoryQuizzes?: Map<string, any>): Promise<Quiz[]> {
    const creatorId = await this.resolveUserId(teacherUsername);
    let userIds: string[] = [];

    if (creatorId) {
      userIds.push(creatorId);
    } else if (inMemoryUsers) {
      // Fallback to in-memory user for legacy admins/teachers
      const memUser = Array.from(inMemoryUsers.entries()).find(([, u]) => (u as any).username === teacherUsername);
      if (memUser) {
        userIds.push(memUser[0]);
      }
    }

    if (userIds.length === 0) {
      console.log(`[MongoStorage.listQuizzesByTeacher] No user IDs found for ${teacherUsername}`);
      userIds.push(teacherUsername);
    }

    console.log(`[MongoStorage.listQuizzesByTeacher] Querying MongoDB for quizzes by userIds: ${userIds.join(', ')}`);
    const mongoQuizzes = await QuizModel.find({ createdByUserId: { $in: userIds } }).sort({ createdAt: -1 }).lean();
    const quizzes = mongoQuizzes as unknown as Quiz[];
    console.log(`[MongoStorage.listQuizzesByTeacher] Found ${quizzes.length} quizzes in MongoDB`);
    console.log(`[MongoStorage.listQuizzesByTeacher] Quizzes with visibility:`, quizzes.map(q => ({ title: q.title, visibility: q.visibility })));
    
    // Fallback: merge in-memory quizzes during migration
    if (inMemoryQuizzes && userIds.length > 0) {
      const memoryQuizzes = Array.from(inMemoryQuizzes.values())
        .filter((q: any) => userIds.includes(q.createdByUserId))
        .sort((a: any, b: any) => b.createdAt - a.createdAt);

      
      // Merge by ID (Mongo takes precedence)
      const byId = new Map<string, Quiz>();
      for (const q of memoryQuizzes as any[]) byId.set(q.id, q as Quiz);
      for (const q of quizzes) byId.set(q.id, q);
      return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
    }
    
    return quizzes;
  }

  async listQuizzesForStudent(studentUsername: string, inMemoryQuizzes?: Map<string, any>, inMemoryProfiles?: Map<string, any>, inMemoryUsers?: Map<string, any>): Promise<Quiz[]> {
    const user = await User.findOne({ username: studentUsername }).lean();
    if (!user) return [];
    const profile = await Profile.findOne({ id: (user as any).id }).lean();
    let schoolId = String((profile as any)?.schoolId || '').trim();
    
    // Fallback to in-memory profile if Mongo profile is missing
    if (!schoolId && inMemoryUsers && inMemoryProfiles) {
      const memUser = Array.from(inMemoryUsers.entries()).find(([, u]) => (u as any).username === studentUsername);
      if (memUser) {
        const memProfile = inMemoryProfiles.get(memUser[0]);
        schoolId = String((memProfile as any)?.schoolId || '').trim();
      }
    }

    const mongoQuery: any = schoolId
      ? { $or: [{ visibility: 'global' }, { visibility: 'school', schoolId }] }
      : { visibility: 'global' };

    const mongoQuizzes = await QuizModel.find(mongoQuery).sort({ createdAt: -1 }).lean();
    const quizzes = mongoQuizzes as unknown as Quiz[];
    
    // Fallback: Merge in-memory quizzes (for quizzes created before full Mongo migration)
    if (inMemoryQuizzes && schoolId) {
      const memoryQuizzes = Array.from(inMemoryQuizzes.values())
        .filter((q: any) => q.visibility === 'global' || (q.schoolId === schoolId))
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
      
      // Merge by ID (Mongo takes precedence)
      const byId = new Map<string, Quiz>();
      for (const q of memoryQuizzes as any[]) byId.set(q.id, q as Quiz);
      for (const q of quizzes) byId.set(q.id, q);
      return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
    }
    
    return quizzes;
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    const quiz = await QuizModel.findOne({ id }).lean();
    return quiz ? (quiz as unknown as Quiz) : null;
  }

  async updateQuiz(
    teacherUsername: string,
    id: string,
    updates: {
      title?: string;
      description?: string;
      points?: number;
      questions?: Array<{ id?: string; text: string; options: string[]; answerIndex: number }>;
    }
  ): Promise<{ ok: true; quiz: Quiz } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username: teacherUsername }).lean();
      if (!user) return { ok: false, error: 'Teacher not found' };
      const quiz = await QuizModel.findOne({ id }).lean();
      if (!quiz) return { ok: false, error: 'Quiz not found' };
      if (String((quiz as any).createdByUserId) !== String((user as any).id)) return { ok: false, error: 'Not allowed' };

      const set: any = {};
      if (typeof updates.title === 'string') set.title = updates.title.trim();
      if (typeof updates.description === 'string') set.description = updates.description;
      if (typeof updates.points !== 'undefined') {
        const p = Number(updates.points);
        if (!Number.isFinite(p)) return { ok: false, error: 'Invalid points' };
        set.points = Math.max(1, Math.min(3, Math.floor(p)));
      }
      if (Array.isArray(updates.questions)) {
        const qs = updates.questions
          .map((q) => ({
            id: q.id || randomUUID(),
            text: String(q.text || '').trim(),
            options: (q.options || []).map(String).slice(0, 4),
            answerIndex: Math.max(0, Math.min(3, Number(q.answerIndex) || 0)),
          }))
          .filter((q) => q.text && q.options.length >= 2);
        if (qs.length === 0) return { ok: false, error: 'At least one question required' };
        set.questions = qs;
      }

      const updated = await QuizModel.findOneAndUpdate({ id }, { $set: set }, { new: true }).lean();
      if (!updated) return { ok: false, error: 'Quiz not found' };
      return { ok: true, quiz: updated as unknown as Quiz };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async deleteQuiz(teacherUsername: string, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username: teacherUsername }).lean();
      if (!user) return { ok: false, error: 'Teacher not found' };
      const quiz = await QuizModel.findOne({ id }).lean();
      if (!quiz) return { ok: false, error: 'Quiz not found' };
      if (String((quiz as any).createdByUserId) !== String((user as any).id)) return { ok: false, error: 'Not allowed' };
      await QuizModel.deleteOne({ id });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async submitQuiz(
    studentUsername: string,
    input: { quizId: string; answers?: number[]; scorePercent?: number }
  ): Promise<{ ok: true; attempt: QuizAttempt } | { ok: false; error: string }> {
    try {
      const user = await User.findOne({ username: studentUsername }).lean();
      if (!user) return { ok: false, error: 'Student not found' };

      const quiz = await QuizModel.findOne({ id: input.quizId }).lean();
      if (!quiz) return { ok: false, error: 'Quiz not found' };

      const profile = await Profile.findOne({ id: (user as any).id }).lean();
      const schoolId = String((profile as any)?.schoolId || '').trim();
      const allowed = (quiz as any).visibility === 'global' || (!!schoolId && schoolId === String((quiz as any).schoolId || ''));
      if (!allowed) return { ok: false, error: 'Quiz not available' };

      const existing = await QuizAttemptModel.findOne({ quizId: input.quizId, userId: (user as any).id }).lean();
      if (existing) return { ok: false, error: 'Already attempted' };

      const attemptDoc = await QuizAttemptModel.create({
        id: randomUUID(),
        quizId: input.quizId,
        userId: (user as any).id,
        answers: Array.isArray(input.answers) ? input.answers.map((n) => Number(n)) : [],
        score: Math.max(0, Math.min(100, Math.round(Number(input.scorePercent) || 0))),
        submittedAt: Date.now(),
      });

      const raw = attemptDoc.toObject() as any;
      const attempt: QuizAttempt = {
        id: raw.id,
        quizId: raw.quizId,
        studentUserId: raw.userId,
        answers: raw.answers,
        scorePercent: raw.score,
        attemptedAt: raw.submittedAt,
      };

      return { ok: true, attempt };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async getStudentQuizAttempt(studentUsername: string, quizId: string): Promise<QuizAttempt | null> {
    const user = await User.findOne({ username: studentUsername }).lean();
    if (!user) return null;
    const attempt = await QuizAttemptModel.findOne({ quizId, userId: (user as any).id }).lean();
    if (!attempt) return null;

    return {
      id: (attempt as any).id,
      quizId: (attempt as any).quizId,
      studentUserId: (attempt as any).userId,
      answers: (attempt as any).answers,
      scorePercent: (attempt as any).score,
      attemptedAt: (attempt as any).submittedAt,
    };
  }

  // ===== Application Methods =====

  async createApplication(data: {
    id: string;
    username: string;
    password: string;
    role: 'student' | 'teacher';
    name: string;
    email: string;
    schoolId: string;
    status: 'pending';
    createdAt: number;
    // student fields
    studentId?: string;
    rollNumber?: string;
    className?: string;
    section?: string;
    // teacher fields
    teacherId?: string;
    subject?: string;
    // shared optional
    photoDataUrl?: string;
  }) {
    console.log('APPLICATION:', data.username, data.role, data.status);
    return await Application.create(data);
  }

  async listPendingApplications(role?: 'student' | 'teacher') {
    const query: any = { status: 'pending' };
    if (role) query.role = role;
    const apps = await Application.find(query).sort({ createdAt: 1 }).lean();
    return apps.map((a: any) => ({
      id: a.id,
      username: a.username,
      password: a.password,
      role: a.role,
      name: a.name,
      email: a.email,
      schoolId: a.schoolId,
      status: a.status,
      createdAt: a.createdAt,
      studentId: a.studentId,
      rollNumber: a.rollNumber,
      className: a.className,
      section: a.section,
      teacherId: a.teacherId,
      subject: a.subject,
      photoDataUrl: a.photoDataUrl,
    }));
  }

  async getApplicationById(id: string) {
    const a = await Application.findOne({ id }).lean();
    return a ? (a as any) : null;
  }

  async getApplicationByUsername(username: string) {
    const a = await Application.findOne({ username, status: 'pending' }).lean();
    return a ? (a as any) : null;
  }

  async isUsernameInPendingApplications(username: string): Promise<boolean> {
    const count = await Application.countDocuments({ username, status: 'pending' });
    return count > 0;
  }

  async deleteApplication(id: string) {
    const result = await Application.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // ===== Games =====

  async createGame(data: {
    id?: string;
    name: string;
    category: string;
    description?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    points: number;
    icon?: string;
    externalUrl: string;
    image?: string;
    createdAt?: number;
    createdByUserId?: string;
  }) {
    const id = data.id || randomUUID();
    const doc = await Game.create({
      id,
      name: data.name,
      category: data.category,
      description: data.description || '',
      difficulty: data.difficulty || 'Easy',
      points: data.points,
      icon: data.icon || '',
      externalUrl: data.externalUrl,
      image: data.image || '',
      createdAt: data.createdAt ?? Date.now(),
      createdByUserId: data.createdByUserId || '',
    });
    console.log('Mongo: createGame', doc.id);
    return doc.toObject() as any;
  }

  async updateGame(id: string, updates: Partial<{
    name: string; category: string; description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard'; points: number;
    icon: string; externalUrl: string; image: string;
  }>) {
    await Game.updateOne({ id }, { $set: updates });
    return await Game.findOne({ id }).lean();
  }

  async deleteGame(id: string) {
    const result = await Game.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async listGames() {
    console.time('games');
    const docs = await Game.find({})
      .select('id name category description points icon externalUrl image')
      .lean();
    console.timeEnd('games');
    return (docs as any[]).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      description: d.description,
      points: d.points,
      icon: d.icon,
      externalUrl: d.externalUrl,
      image: d.image,
    }));
  }

  async getGameById(id: string) {
    const d = await Game.findOne({ id }).lean();
    return d ? (d as any) : null;
  }

  async findGameByName(name: string) {
    const escaped = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const game = await Game.findOne({ name: { $regex: `^${escaped}$`, $options: 'i' } }).lean();
    return game ? (game as any) : null;
  }

  async gameIdExists(id: string) {
    return (await Game.countDocuments({ id })) > 0;
  }

  async getGameCount() {
    return await Game.countDocuments({});
  }

  // ===== Game Plays =====

  async createGamePlay(data: {
    id?: string;
    studentUserId: string;
    gameId: string;
    points?: number;
    playedAt?: number;
  }) {
    const id = data.id || randomUUID();
    const doc = await GamePlay.create({
      id,
      studentUserId: data.studentUserId,
      gameId: data.gameId,
      points: data.points ?? 0,
      playedAt: data.playedAt ?? Date.now(),
    });
    return doc.toObject() as any;
  }

  async listGamePlaysByUser(studentUserId: string) {
    const docs = await GamePlay.find({ studentUserId }).sort({ playedAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d.id, studentUserId: d.studentUserId,
      gameId: d.gameId, points: d.points, playedAt: d.playedAt,
    }));
  }

  async getLastGamePlayTime(studentUserId: string, gameId: string): Promise<number> {
    const doc = await GamePlay.findOne({ studentUserId, gameId }).sort({ playedAt: -1 }).lean();
    return (doc as any)?.playedAt ?? 0;
  }

  async hasEarnedPointsForGame(studentUserId: string, gameId: string): Promise<boolean> {
    const count = await GamePlay.countDocuments({ studentUserId, gameId, points: { $gt: 0 } });
    return count > 0;
  }

  async hasEarnedPointsForGameToday(studentUserId: string, gameId: string, referenceTime = Date.now()): Promise<boolean> {
    const now = new Date(referenceTime);
    const startOfDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    const count = await GamePlay.countDocuments({
      studentUserId,
      gameId,
      points: { $gt: 0 },
      playedAt: { $gte: startOfDay, $lt: endOfDay },
    });
    return count > 0;
  }

  async getAllGamePlaysForUser(studentUserId: string) {
    const docs = await GamePlay.find({ studentUserId }).lean();
    return docs.map((d: any) => ({
      id: d.id, studentUserId: d.studentUserId,
      gameId: d.gameId, points: d.points, playedAt: d.playedAt,
    }));
  }

  // ===== Learning Modules =====

  async createLearningModule(data: {
    id?: string;
    title: string;
    description?: string;
    lessons?: any[];
    createdAt?: number;
    createdByUserId?: string;
    visibility?: string;
  }) {
    const id = data.id || randomUUID();
    const doc = await LearningModule.create({
      id,
      title: data.title,
      description: data.description || '',
      lessons: data.lessons || [],
      createdAt: data.createdAt ?? Date.now(),
      createdByUserId: data.createdByUserId || '',
      visibility: data.visibility || 'school',
    });
    return doc.toObject() as any;
  }

  async listLearningModules() {
    return await LearningModule.find().lean();
  }

  async getLearningModuleById(id: string) {
    const d = await LearningModule.findOne({ id }).lean();
    return d ? (d as any) : null;
  }

  async updateLearningModule(id: string, updates: Partial<{
    title: string; description: string; lessons: any[];
    visibility: string;
  }>) {
    await LearningModule.updateOne({ id }, { $set: updates });
    return await LearningModule.findOne({ id }).lean();
  }

  async deleteLearningModule(id: string) {
    const result = await LearningModule.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // ===== Lesson Completions =====

  async completeLesson(data: {
    id?: string;
    studentUserId: string;
    moduleId: string;
    moduleTitle?: string;
    lessonId: string;
    lessonTitle?: string;
    points?: number;
    completedAt?: number;
  }) {
    const id = data.id || randomUUID();
    // Upsert: one record per student per lesson
    await LessonCompletion.updateOne(
      { studentUserId: data.studentUserId, moduleId: data.moduleId, lessonId: data.lessonId },
      {
        $setOnInsert: {
          id,
          studentUserId: data.studentUserId,
          moduleId: data.moduleId,
          moduleTitle: data.moduleTitle || '',
          lessonId: data.lessonId,
          lessonTitle: data.lessonTitle || '',
          points: data.points ?? 0,
          completedAt: data.completedAt ?? Date.now(),
        },
      },
      { upsert: true }
    );
    return await LessonCompletion.findOne({
      studentUserId: data.studentUserId,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
    }).lean();
  }

  async listLessonCompletions(studentUserId: string) {
    const docs = await LessonCompletion.find({ studentUserId }).sort({ completedAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d.id, studentUserId: d.studentUserId,
      moduleId: d.moduleId, moduleTitle: d.moduleTitle,
      lessonId: d.lessonId, lessonTitle: d.lessonTitle,
      points: d.points, completedAt: d.completedAt,
    }));
  }

  async getLessonCompletionsByModule(studentUserId: string, moduleId: string) {
    const docs = await LessonCompletion.find({ studentUserId, moduleId }).lean();
    return docs as any[];
  }

  async hasCompletedLesson(studentUserId: string, moduleId: string, lessonId: string): Promise<boolean> {
    const count = await LessonCompletion.countDocuments({ studentUserId, moduleId, lessonId });
    return count > 0;
  }

  // ===== Notifications =====

  async createNotification(data: {
    id?: string;
    userId: string;
    message: string;
    type?: string;
    createdAt?: number;
  }) {
    const id = data.id || randomUUID();
    const doc = await Notification.create({
      id,
      userId: data.userId,
      message: data.message,
      type: data.type || 'info',
      createdAt: data.createdAt ?? Date.now(),
      readAt: null,
    });
    console.log('Mongo: createNotification', doc.id);
    return doc.toObject() as any;
  }

  async listNotifications(userId: string) {
    const docs = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d.id, userId: d.userId, message: d.message,
      type: d.type, createdAt: d.createdAt, readAt: d.readAt,
    }));
  }

  async markAllNotificationsRead(userId: string) {
    const now = Date.now();
    await Notification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: now } }
    );
  }

  async markNotificationRead(id: string) {
    await Notification.updateOne({ id }, { $set: { readAt: Date.now() } });
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    return await Notification.countDocuments({ userId, readAt: null });
  }

  async createNotificationsForSchool(schoolId: string, message: string, type: string, excludeRoles?: string[]) {
    // Find all user IDs in the school via Profile
    const query: any = { schoolId };
    if (excludeRoles?.length) query.role = { $nin: excludeRoles };
    const profiles = await Profile.find(query).select({ id: 1 }).lean();
    const now = Date.now();
    const docs = profiles.map((p: any) => ({
      id: randomUUID(),
      userId: p.id,
      message,
      type,
      createdAt: now,
      readAt: null,
    }));
    if (docs.length > 0) await Notification.insertMany(docs);
    return docs.length;
  }

  // ===== Videos =====

  async createVideo(data: {
    id?: string;
    title: string;
    description?: string;
    type?: 'youtube' | 'file';
    url: string;
    thumbnail?: string;
    credits?: number;
    uploadedBy: string;
    category?: string;
    duration?: number;
    uploadedAt?: number;
  }) {
    const id = data.id || randomUUID();
    const doc = await Video.create({
      id,
      title: data.title,
      description: data.description || '',
      type: data.type || 'youtube',
      url: data.url,
      thumbnail: data.thumbnail || '',
      credits: data.credits ?? 0,
      uploadedBy: data.uploadedBy,
      category: data.category || '',
      duration: data.duration ?? 0,
      uploadedAt: data.uploadedAt ?? Date.now(),
    });
    console.log('Mongo: createVideo', doc.id);
    return doc.toObject() as any;
  }

  async listVideos() {
    const docs = await Video.find({}).sort({ uploadedAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d.id, title: d.title, description: d.description,
      type: d.type, url: d.url, thumbnail: d.thumbnail,
      credits: d.credits, uploadedBy: d.uploadedBy,
      category: d.category, duration: d.duration, uploadedAt: d.uploadedAt,
    }));
  }

  async getVideosByUploader(uploadedBy: string) {
    const uploaderId = await this.resolveUserId(uploadedBy);
    const docs = await Video.find({ uploadedBy: uploaderId ?? uploadedBy }).select('id').sort({ uploadedAt: -1 }).lean();
    return docs as any[];
  }

  async getVideoById(id: string) {
    const d = await Video.findOne({ id }).lean();
    return d ? (d as any) : null;
  }

  async updateVideo(id: string, updates: Partial<{
    title: string; description: string; type: 'youtube' | 'file';
    url: string; thumbnail: string; credits: number;
    category: string; duration: number; uploadedBy: string;
  }>) {
    await Video.updateOne({ id }, { $set: updates });
    return await Video.findOne({ id }).lean();
  }

  async deleteVideo(id: string) {
    await Video.deleteOne({ id });
    // Clean up associated progress records
    await UserVideoProgress.deleteMany({ videoId: id });
  }

  // ===== Video Progress =====

  async markVideoWatched(data: {
    id?: string;
    userId: string;
    videoId: string;
    watchedAt?: number;
    creditsAwarded?: boolean;
  }) {
    const now = data.watchedAt ?? Date.now();
    await UserVideoProgress.updateOne(
      { userId: data.userId, videoId: data.videoId },
      {
        $set: {
          watched: true,
          watchedAt: now,
          creditsAwarded: data.creditsAwarded ?? false,
        },
        $setOnInsert: {
          id: data.id || randomUUID(),
          userId: data.userId,
          videoId: data.videoId,
        },
      },
      { upsert: true }
    );
    return await UserVideoProgress.findOne({ userId: data.userId, videoId: data.videoId }).lean();
  }

  async getVideoProgress(userId: string, videoId: string) {
    const d = await UserVideoProgress.findOne({ userId, videoId }).lean();
    return d ? (d as any) : null;
  }

  async listVideoProgressForUser(userId: string) {
    const docs = await UserVideoProgress.find({ userId }).lean();
    return docs as any[];
  }

  // ===== User Credits =====

  async getUserCredits(userId: string): Promise<{ totalCredits: number; lastUpdated: number }> {
    const d = await UserCredits.findOne({ userId }).lean();
    if (!d) return { totalCredits: 0, lastUpdated: Date.now() };
    return { totalCredits: (d as any).totalCredits, lastUpdated: (d as any).lastUpdated };
  }

  async updateUserCredits(userId: string, addCredits: number): Promise<{ totalCredits: number; lastUpdated: number }> {
    const now = Date.now();
    const result = await UserCredits.findOneAndUpdate(
      { userId },
      {
        $inc: { totalCredits: addCredits },
        $set: { lastUpdated: now },
        $setOnInsert: { id: randomUUID(), userId },
      },
      { upsert: true, new: true }
    ).lean();
    return {
      totalCredits: (result as any)?.totalCredits ?? addCredits,
      lastUpdated: (result as any)?.lastUpdated ?? now,
    };
  }

  // ===== Task Groups =====

  async createTaskGroup(data: {
    id?: string;
    title: string;
    teacherUserId: string;
    taskIds?: string[];
    createdAt?: number;
  }) {
    const id = data.id || randomUUID();
    const doc = await TaskGroup.create({
      id,
      title: data.title,
      teacherUserId: data.teacherUserId,
      taskIds: data.taskIds || [],
      createdAt: data.createdAt ?? Date.now(),
    });
    return doc.toObject() as any;
  }

  async listTaskGroups(teacherUserId: string) {
    const docs = await TaskGroup.find({ teacherUserId }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d.id, title: d.title, teacherUserId: d.teacherUserId,
      taskIds: d.taskIds, createdAt: d.createdAt,
    }));
  }

  async updateTaskGroup(id: string, updates: Partial<{ title: string; taskIds: string[] }>) {
    await TaskGroup.updateOne({ id }, { $set: updates });
    return await TaskGroup.findOne({ id }).lean();
  }

  async deleteTaskGroup(id: string) {
    const result = await TaskGroup.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async setStudentPrivacy(username: string, allowExternalView: boolean) {
    console.log('setStudentPrivacy called with username:', username, 'allowExternalView:', allowExternalView);
    const user = await this.getUserByUsername(username);
    console.log('User found:', user);
    if (!user) return { ok: false as const, error: 'User not found' };
    
    // Check if profile exists
    const existingProfile = await Profile.findOne({ id: user.id }).lean();
    console.log('Existing profile:', existingProfile);
    
    if (!existingProfile) {
      // Create profile with student role
      await Profile.create({
        id: user.id,
        role: 'student',
        allowExternalView: !!allowExternalView,
      });
    } else {
      if (existingProfile.role !== 'student') return { ok: false as const, error: 'Not a student' };
      await Profile.updateOne(
        { id: user.id },
        { $set: { allowExternalView: !!allowExternalView } }
      );
    }
    
    return { ok: true as const };
  }
}
