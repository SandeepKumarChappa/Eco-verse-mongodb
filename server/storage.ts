import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { MongoStorage } from "./mongo-storage";
import { Task as MongoTask } from "./models/Task";
import { Submission as MongoSubmission } from "./models/Submission";
import { User as MongoUser } from "./models/User";
import { Announcement as MongoAnnouncement } from "./models/Announcement";
import { Profile as MongoProfile } from "./models/Profile";
import { Quiz as MongoQuiz } from "./models/Quiz";
import { QuizAttempt as MongoQuizAttempt } from "./models/QuizAttempt";
import { School as MongoSchool } from "./models/School";
import { Application as MongoApplication } from "./models/Application";
import { Assignment as MongoAssignment } from "./models/Assignment";
import { AssignmentSubmission as MongoAssignmentSubmission } from "./models/AssignmentSubmission";
import { LessonCompletion as MongoLessonCompletion } from "./models/LessonCompletion";
import { GamePlay as MongoGamePlay } from "./models/GamePlay";

const mongoStorage = new MongoStorage();
console.log("Using MongoDB for users, tasks, and announcements");
console.log("Using MongoDB for quizzes");
console.log("Using MongoDB for assignments");
console.log("Using MongoDB for submissions");

/**
 * Helper to wrap MongoDB calls with a timeout to prevent blocking requests.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2000): Promise<T> {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('MongoDB Timeout')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

const BCRYPT_SALT_ROUNDS = 10;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateQuiz(teacherUsername: string, id: string, updates: { title?: string; description?: string; points?: number; questions?: Array<{ id?: string; text: string; options: string[]; answerIndex: number }> }): Promise<{ ok: true; quiz: Quiz } | { ok: false; error: string }>;
  deleteQuiz(teacherUsername: string, id: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Schools
  listSchools(): Promise<Array<{ id: string; name: string }>>;
  addSchool(name: string): Promise<{ id: string; name: string }>; // simplistic
  removeSchool(id: string): Promise<boolean>;
  // Signups
  addStudentApplication(app: StudentApplication): Promise<StudentApplication>;
  addTeacherApplication(app: TeacherApplication): Promise<TeacherApplication>;
  listPending(): Promise<{ students: StudentApplication[]; teachers: TeacherApplication[] }>;
  approveApplication(type: "student" | "teacher", id: string): Promise<boolean>;
  // Username and status
  isUsernameAvailable(username: string): Promise<boolean>;
  getApplicationStatus(username: string): Promise<"pending" | "approved" | "none">;
  // OTP
  saveOtp(email: string, code: string, ttlMs: number): Promise<void>;
  verifyOtp(email: string, code: string): Promise<boolean>;
  // Admin ops
  resetPassword(username: string, password: string): Promise<boolean>;
  unapproveUser(username: string): Promise<boolean>;
  // Admin accounts
  listAdmins(): Promise<Array<{ username: string; name?: string; email?: string }>>;
  createAdmin(input: { username: string; password: string; name?: string; email?: string }): Promise<{ ok: true } | { ok: false; error: string }>;
  updateAdmin(username: string, updates: { username?: string; name?: string; email?: string }, currentUsername?: string): Promise<{ ok: true } | { ok: false; error: string }>;
  deleteAdmin(username: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Tasks & submissions
  createTask(teacherUsername: string, input: { title: string; description?: string; deadline?: string; proofType?: 'photo'; maxPoints: number; groupMode?: 'solo' | 'group'; maxGroupSize?: number }): Promise<{ ok: true; task: Task } | { ok: false; error: string }>;
  listTeacherTasks(teacherUsername: string): Promise<Task[]>;
  listStudentTasks(studentUsername: string): Promise<Array<{ task: Task; submission?: TaskSubmission }>>;
  submitTask(studentUsername: string, taskId: string, photoDataUrlOrList: string | string[]): Promise<{ ok: true; submission: TaskSubmission } | { ok: false; error: string }>;
  listSubmissionsForTeacher(teacherUsername: string, taskId?: string): Promise<Array<TaskSubmission & { studentUsername: string; studentName?: string; className?: string; section?: string; groupMembers?: string[]; taskMaxPoints?: number }>>;
  reviewSubmission(teacherUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }): Promise<{ ok: true } | { ok: false; error: string }>;
  // Announcements
  createAnnouncement(teacherUsername: string, input: { title: string; body?: string }): Promise<{ ok: true; announcement: Announcement } | { ok: false; error: string }>;
  listAnnouncementsForTeacher(teacherUsername: string): Promise<Announcement[]>;
  createAdminAnnouncement(adminUsername: string, input: { title: string; body?: string }): Promise<{ ok: true; announcement: Announcement } | { ok: false; error: string }>;
  listAdminAnnouncements(adminUsername: string): Promise<Announcement[]>;
  updateAdminAnnouncement(adminUsername: string, announcementId: string, updates: { title?: string; body?: string }): Promise<{ ok: true; announcement: Announcement } | { ok: false; error: string }>;
  deleteAdminAnnouncement(adminUsername: string, announcementId: string): Promise<{ ok: true } | { ok: false; error: string }>;
  listStudentAnnouncements(studentUsername: string): Promise<Announcement[]>;
  // Groups
  createTaskGroup(studentUsername: string, taskId: string, members: string[]): Promise<{ ok: true; group: TaskGroup & { memberUsernames: string[] } } | { ok: false; error: string }>;
  getTaskGroupForStudent(studentUsername: string, taskId: string): Promise<(TaskGroup & { memberUsernames: string[] }) | null>;
  // Profiles (self-service)
  getOwnProfile(username: string): Promise<ProfilePayload | null>;
  updateOwnProfile(username: string, updates: Partial<ProfileUpsert>): Promise<{ ok: true; profile: ProfilePayload } | { ok: false; error: string }>;
  // Student Profile (dashboard view)
  getStudentProfile(username: string): Promise<StudentProfileView | null>;
  setStudentPrivacy(username: string, allowExternalView: boolean): Promise<{ ok: true } | { ok: false; error: string }>;
  // Learning modules
  listLessonCompletions(studentUsername: string): Promise<LessonCompletion[]>;
  completeLesson(studentUsername: string, input: { moduleId: string; moduleTitle: string; lessonId: string; lessonTitle: string; points: number }): Promise<{ ok: true; completion: LessonCompletion; alreadyCompleted: boolean } | { ok: false; error: string }>;
  listLearningModules(): Promise<LearningModule[]>;
  listManagedLearningModules(managerUsername: string): Promise<LearningModule[]>;
  upsertManagedLearningModule(managerUsername: string, input: { id?: string; title: string; description?: string; lessons: Array<{ id?: string; title: string; duration?: string; points: number; content?: string }> }): Promise<{ ok: true; module: LearningModule } | { ok: false; error: string }>;
  deleteManagedLearningModule(managerUsername: string, moduleId: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Activity logging & notifications
  addQuizAttempt(studentUsername: string, input: { quizId: string; answers?: number[]; scorePercent?: number }): Promise<{ ok: true; attempt: QuizAttempt } | { ok: false; error: string }>;
  getStudentQuizAttempt(username: string, quizId: string): Promise<QuizAttempt | null>;
  addGamePlay(studentUsername: string, gameId: string): Promise<{ ok: true; play: GamePlay } | { ok: false; error: string }>;
  getStudentGameSummary(username: string): Promise<{
    totalGamePoints: number;
    badges: string[];
    monthCompletedCount: number;
    totalUniqueGames: number;
  }>;
  listNotifications(username: string): Promise<NotificationItem[]>;
  markAllNotificationsRead(username: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Games catalog (admin-managed)
  listGames(): Promise<Game[]>;
  listAdminGames(adminUsername: string): Promise<Game[]>;
  createAdminGame(adminUsername: string, input: { id?: string; name: string; category: string; description?: string; difficulty?: 'Easy' | 'Medium' | 'Hard'; points: number; icon?: string; externalUrl: string; image?: string }): Promise<{ ok: true; game: Game } | { ok: false; error: string }>;
  updateAdminGame(adminUsername: string, gameId: string, updates: Partial<{ name: string; category: string; description?: string; difficulty?: 'Easy' | 'Medium' | 'Hard'; points: number; icon?: string; externalUrl: string; image?: string }>): Promise<{ ok: true; game: Game } | { ok: false; error: string }>;
  deleteAdminGame(adminUsername: string, gameId: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Assignments
  createAssignment(teacherUsername: string, input: { title: string; description?: string; deadline?: string; maxPoints?: number }): Promise<{ ok: true; assignment: Assignment } | { ok: false; error: string }>;
  listTeacherAssignments(teacherUsername: string): Promise<Assignment[]>;
  createAdminAssignment(adminUsername: string, input: { title: string; description?: string; deadline?: string; maxPoints?: number }): Promise<{ ok: true; assignment: Assignment } | { ok: false; error: string }>;
  listAdminAssignments(adminUsername: string): Promise<Assignment[]>;
  // Schools
  getOrCreateSchoolByName(name: string): Promise<{ id: string; name: string }>;
  updateAdminAssignment(adminUsername: string, assignmentId: string, updates: { title?: string; description?: string; deadline?: string; maxPoints?: number }): Promise<{ ok: true; assignment: Assignment } | { ok: false; error: string }>;
  deleteAdminAssignment(adminUsername: string, assignmentId: string): Promise<{ ok: true } | { ok: false; error: string }>;
  listStudentAssignments(studentUsername: string): Promise<Array<{ assignment: Assignment; submission?: AssignmentSubmission }>>;
  submitAssignment(studentUsername: string, assignmentId: string, filesOrList: string | string[]): Promise<{ ok: true; submission: AssignmentSubmission } | { ok: false; error: string }>;
  listAssignmentSubmissionsForTeacher(teacherUsername: string, assignmentId?: string, page?: number, limit?: number): Promise<{ data: Array<{ studentName: string; assignmentTitle: string; points: number; status: string; submittedAt: number }>; total: number; page: number; totalPages: number }>;
  reviewAssignmentSubmission(teacherUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }): Promise<{ ok: true } | { ok: false; error: string }>;
  listAssignmentSubmissionsForAdmin(adminUsername: string, assignmentId?: string, page?: number, limit?: number): Promise<{ data: Array<{ studentName: string; assignmentTitle: string; points: number; status: string; submittedAt: number }>; total: number; page: number; totalPages: number }>;
  reviewAdminAssignmentSubmission(adminUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }): Promise<{ ok: true } | { ok: false; error: string }>;
  // Admin quizzes CRUD
  updateAdminQuiz(adminUsername: string, id: string, updates: { title?: string; description?: string; points?: number; questions?: Array<{ id?: string; text: string; options: string[]; answerIndex: number }> }): Promise<{ ok: true; quiz: Quiz } | { ok: false; error: string }>;
  deleteAdminQuiz(adminUsername: string, id: string): Promise<{ ok: true } | { ok: false; error: string }>;
  // Leaderboard
  getGlobalSchoolsLeaderboard(limit?: number): Promise<Array<{ schoolId: string; schoolName: string; ecoPoints: number; students: number; topStudent?: { username: string; name?: string; ecoPoints: number } }>>;
  getSchoolStudentsLeaderboard(schoolId: string, limit?: number, offset?: number): Promise<Array<{ username: string; name?: string; ecoPoints: number }>>;
  getStudentPreview(targetUsername: string): Promise<{ username: string; name?: string; ecoPoints: number; schoolId?: string } | null>;
  getGlobalStudentsLeaderboard(limit?: number, offset?: number, schoolIdFilter?: string | null): Promise<Array<{ username: string; name?: string; schoolId?: string; schoolName?: string; ecoPoints: number; achievements?: string[]; snapshot?: { tasksApproved: number; quizzesCompleted: number } }>>;
  getGlobalTeachersLeaderboard(limit?: number, offset?: number, schoolIdFilter?: string | null): Promise<Array<{ username: string; name?: string; schoolId?: string; schoolName?: string; ecoPoints: number; tasksCreated: number; quizzesCreated: number }>>;
  getSchoolPreview(schoolId: string): Promise<{ schoolId: string; schoolName: string; ecoPoints: number; students: number; topStudent?: { username: string; name?: string; ecoPoints: number } } | null>;
  getTeacherPreview(targetUsername: string): Promise<{ username: string; name?: string; schoolId?: string; schoolName?: string; ecoPoints: number; tasksCreated: number; quizzesCreated: number } | null>;
  getAdminLeaderboardAnalytics(): Promise<{ activeSchoolsThisWeek: number; newStudentsThisWeek: number; totalEcoPointsThisWeek: number; inactiveSchools: Array<{ schoolId: string; schoolName: string }>; }>
  // Dev/demo data helpers
  seedSchoolsAndStudents(input: { schools: number; students: number; adminUsername?: string }): Promise<{ schoolsCreated: number; studentsCreated: number }>;
  // Video Management
  getAllVideos(): Promise<Video[]>;
  getTeacherVideos(teacherId: string): Promise<Video[]>;
  getTeacherVideosCount(teacherUsername: string): Promise<number>;
  createVideo(input: { title: string; description?: string; type: 'youtube' | 'file'; url: string; thumbnail?: string; credits: number; uploadedBy: string; category?: string; duration?: number }): Promise<Video>;
  updateVideo(id: string, updates: Partial<{ title: string; description: string; type: 'youtube' | 'file'; url: string; thumbnail: string; credits: number; category: string; duration: number; uploadedBy: string }>): Promise<Video>;
  deleteVideo(id: string): Promise<void>;
  getUserCredits(username: string): Promise<{ totalCredits: number; lastUpdated: number }>;
  recordVideoWatch(username: string, videoId: string): Promise<{ success: boolean; creditsAwarded: number }>;
  awardCredits(username: string, videoId: string, credits: number): Promise<{ success: boolean; newTotal: number }>;
  fetchYouTubeMetadata(url: string): Promise<{ title: string; description: string; thumbnail: string; duration?: number }>;
}

export class MemStorage implements IStorage {
  private mongoStorage: MongoStorage;
  private users = new Map<string, any>();
  private roles = new Map<string, string>();
  private profiles = new Map<string, any>();
  private schools = new Map<string, any>();
  private announcements = new Map<string, any>();
  private videos = new Map<string, any>();
  private otps = new Map<string, { code: string; expires: number }>();
  private lastGamePlay = new Map<string, number>();
  private lessonCompletions = new Map<string, any>();
  private groups = new Map<string, any>();
  private studentProfileCache = new Map<string, { expiresAt: number; profile: StudentProfileView }>();

  private getRuntimeRoot() {
    const cwd = typeof process.cwd === 'function' ? process.cwd() : '';
    if (typeof cwd === 'string' && cwd.length > 0) return cwd;
    console.warn('process.cwd() unavailable, falling back to current directory for storage path.');
    return '.';
  }

  constructor() {
    // Removed data.json loading and Map initialization
    // Removed fs.readFileSync and JSON.parse logic
    // Removed Map initialization for users, roles, schools, etc.

    this.mongoStorage = mongoStorage;
    this.normalizeStoredPasswords();
    this.ensureAdminPassword();
    this.ensureDemoLearningModules().catch(err => console.error("Error seeding learning modules:", err));
  }

  private isPasswordHash(value: string) {
    return /^\$2[aby]\$\d{2}\$/.test(value);
  }

  private toHashedPassword(value?: string) {
    const normalized = String(value || "");
    if (!normalized) return "";
    if (this.isPasswordHash(normalized)) return normalized;
    return bcrypt.hashSync(normalized, BCRYPT_SALT_ROUNDS);
  }

  private normalizeStoredPasswords() {
    // MongoDB handles password normalization
  }

  // Ensure admin123 always has the correct canonical password on startup.
  // This prevents a stale/corrupt hash in data.json from permanently locking out admin.
  private ensureAdminPassword() {
    // MongoDB handles admin password management
  }

  // Ensure admin123 exists in MongoDB on every startup.
  // Since login is now MongoDB-only, the admin must be in MongoDB to be able to log in.
  async ensureAdminInMongo() {
    const ADMIN_USERNAME = 'admin123';
    const ADMIN_PASSWORD = 'admin@1234';
    const ADMIN_ROLE = 'admin';

    try {
      const { User: MongoUserModel } = await import('./models/User');

      // Determine hash to use — use correct password
      const correctHash = bcrypt.hashSync(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

      // Check if admin exists in MongoDB
      const existing = await MongoUserModel.findOne({ username: ADMIN_USERNAME }).lean();
      if (!existing) {
        const adminId = randomUUID();
        await MongoUserModel.create({ id: adminId, username: ADMIN_USERNAME, password: correctHash });
        await MongoProfile.updateOne(
          { id: adminId },
          { $set: { id: adminId, role: ADMIN_ROLE, name: 'Admin', email: '' } },
          { upsert: true }
        );
        console.log(`AUTH: admin123 seeded into MongoDB (id=${adminId})`);
      } else {
        // Update password hash to always match canonical password
        const isCorrect = bcrypt.compareSync(ADMIN_PASSWORD, String((existing as any).password || ''));
        if (!isCorrect) {
          await MongoUserModel.updateOne({ username: ADMIN_USERNAME }, { $set: { password: correctHash } });
          console.log('AUTH: admin123 password hash corrected in MongoDB');
        }
        // Ensure profile with admin role exists
        const adminId = String((existing as any).id);
        await MongoProfile.updateOne(
          { id: adminId },
          { $set: { id: adminId, role: ADMIN_ROLE, name: 'Admin' } },
          { upsert: true }
        );
        console.log('AUTH: admin123 verified in MongoDB');
      }
    } catch (err) {
      console.error('AUTH: Failed to ensure admin123 in MongoDB:', err);
    }
  }

  async initializeSyncSchoolsToMongo() {
    // Removed - no longer have in-memory Maps for schools
    // Ensure admin123 is always in MongoDB (login is now MongoDB-only)
    await this.ensureAdminInMongo();
    await this.ensureDemoLearningModules();
  }

  async ensureDemoLearningModules() {
    try {
      console.log("Learning modules from MongoDB");
      const existing = await mongoStorage.listLearningModules();
      if (existing.length > 0) return;

      console.log("Seeding learning modules to MongoDB...");
      
      await mongoStorage.createLearningModule({
        id: 'water-conservation',
        title: "Water Conservation",
        description: "Learn how to save water",
        lessons: [
          { id: 'importance-of-water', title: "Importance of water", content: "Water is essential...", points: 50, duration: '10 mins' },
          { id: 'saving-tips', title: "Saving tips", content: "Turn off taps...", points: 50, duration: '10 mins' }
        ],
        visibility: "global",
        createdByUserId: "system"
      });

      await mongoStorage.createLearningModule({
        id: 'reduce-plastic',
        title: "Reduce Plastic",
        description: "Avoid plastic usage",
        lessons: [
          { id: 'plastic-harm', title: "Plastic harm", content: "Plastic damages environment...", points: 50, duration: '10 mins' },
          { id: 'alternatives', title: "Alternatives", content: "Use cloth bags...", points: 50, duration: '10 mins' }
        ],
        visibility: "global",
        createdByUserId: "system"
      });
    } catch (err) {
      console.error("Failed to seed learning modules:", err);
    }
  }


  // Dev helper: bulk-create schools and approved students for demos/leaderboards
  public async seedSchoolsAndStudents(input: { schools: number; students: number; adminUsername?: string }): Promise<{ schoolsCreated: number; studentsCreated: number }> {
    const schoolsTarget = Math.max(0, Math.min(100, Math.floor(Number(input.schools) || 0)));
    const studentsTarget = Math.max(0, Math.min(10000, Math.floor(Number(input.students) || 0)));

    // Ensure main admin exists if requested (best-effort)
    if (input.adminUsername) {
      const hasAdmin = Array.from(this.users.values()).some(u => u.username === input.adminUsername);
      if (!hasAdmin) {
        try { await this.createAdmin({ username: input.adminUsername, password: 'admin@1234', name: 'Admin', email: `${input.adminUsername}@example.com` }); } catch { }
      }
    }

    // 1) Create schools with unique names if needed
    const existingSchoolNames = new Set(Array.from(this.schools.values()).map(s => s.name));
    const baseNames = [
      'Green Valley High', 'Riverdale Academy', 'Sunrise Public School', 'Harmony International', 'Cedar Grove School',
      'Maple Leaf High', 'Blue Horizon School', 'Silver Oak Academy', 'Evergreen Public', 'Springfield High',
      'Lakeside School', 'Hillcrest Academy', 'Oakridge High', 'Starlight Public', 'Pinecrest School',
      'Brookside Academy', 'Riverside High', 'Meadowview School', 'Clearwater Public', 'Willowdale High',
      'Summit Ridge School', 'Grandview Academy', 'Crescent Public', 'Highland High', 'Northfield School',
      'Southridge Academy', 'Westwood High', 'Eastview School', 'Parkside Public', 'Bayview High'
    ];
    let schoolsCreated = 0;
    for (let i = 0; i < schoolsTarget; i++) {
      let name = baseNames[i % baseNames.length];
      // avoid duplicate names
      let suffix = 1;
      let candidate = name;
      while (existingSchoolNames.has(candidate)) {
        suffix++;
        candidate = `${name} ${suffix}`;
      }
      const created = await this.addSchool(candidate);
      existingSchoolNames.add(created.name);
      schoolsCreated++;
    }

    // 2) Create approved students distributed randomly across schools
    const schoolIds = Array.from(this.schools.values()).map(s => s.id);
    const firstSchoolId = schoolIds[0];
    const fnames = ['Aarav', 'Diya', 'Rohan', 'Isha', 'Kabir', 'Anaya', 'Vivaan', 'Myra', 'Arjun', 'Sara', 'Aditya', 'Anika', 'Rahul', 'Pooja', 'Kunal', 'Meera', 'Tejas', 'Nisha', 'Siddharth', 'Kavya', 'Harsh', 'Priya', 'Ritika', 'Ayaan', 'Navya', 'Om', 'Tanvi', 'Yash', 'Zara', 'Ira'];
    const lnames = ['Mehta', 'Kapoor', 'Gupta', 'Sharma', 'Verma', 'Khan', 'Joshi', 'Agarwal', 'Singh', 'Nair', 'Patel', 'Desai', 'Reddy', 'Iyer', 'Das', 'Ghosh', 'Chopra', 'Bose', 'Malhotra', 'Trivedi', 'Pillai', 'Kulkarni', 'Bhat', 'Dutta', 'Menon', 'Shetty', 'Saxena', 'Mishra', 'Bhattacharya', 'Shukla'];
    const sections = ['A', 'B', 'C', 'D'];
    let studentsCreated = 0;

    const usernameExists = (uname: string) => {
      if (Array.from(this.users.values()).some(u => u.username === uname)) return true;
      return false;
    };

    for (let i = 0; i < studentsTarget; i++) {
      const fn = fnames[i % fnames.length];
      const ln = lnames[(i * 7) % lnames.length];
      const base = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
      // ensure unique username with numeric suffix
      let uname = base;
      let counter = 1;
      while (usernameExists(uname)) {
        counter++;
        uname = `${base}${counter}`;
      }
      // choose school
      const schoolId = schoolIds.length ? schoolIds[(i * 13) % schoolIds.length] : firstSchoolId;
      const classNum = String(6 + (i % 7)); // classes 6..12
      const section = sections[(i * 3) % sections.length];
      const roll = String(1 + (i % 60));
      const studentId = `STU${(1000 + i).toString()}`;

      // Create approved user directly
      const id = randomUUID();
      this.users.set(id, { id, username: uname, password: this.toHashedPassword('123@123') });
      this.roles.set(id, 'student');
      this.profiles.set(id, {
        role: 'student',
        name: `${fn} ${ln}`,
        email: `${uname}@example.com`,
        schoolId: schoolId || '',
        studentId,
        rollNumber: roll,
        className: classNum,
        section,
      });
      studentsCreated++;
    }

    this.save();
    return { schoolsCreated, studentsCreated };
  }

  private async ensureDemoGames() {
    // Check if games already exist to avoid slow seeding on every startup
    const existingCount = await mongoStorage.getGameCount();
    if (existingCount > 0) {
      console.log(`Games already seeded (${existingCount} games found), skipping...`);
      return;
    }

    console.log('Seeding demo games into MongoDB...');
    // ... rest of seeding logic
    const base: Array<Omit<Game, 'id' | 'createdAt' | 'createdByUserId'>> = [
      { name: 'SeaVerse: Ocean Guardian', category: 'wildlife', description: 'Protect and restore our oceans. Complete missions to save marine life, stop pollution, and learn about ocean conservation.', difficulty: 'Medium', points: 100, icon: '🌊', externalUrl: 'https://meek-haupia-394af9.netlify.app/', image: '/api/image/360_F_819000674_C4KBdZyevZiKOZUXUqDnx7Vq1Hjskq3g.jpg' },
      { name: 'Eco Word Spell', category: 'fun', description: 'Build environmental vocabulary by spelling eco-themed words in a fast, fun challenge.', difficulty: 'Easy', points: 75, icon: '🔤', externalUrl: 'https://eco-word-spell.lovable.app/', image: '/api/image/1080p-nature-background-nfkrrkh7da3eonyn.jpg' },
      { name: 'Sorting Stories', category: 'recycling', description: 'Sort choices in story-based scenarios to practice better waste and recycling decisions.', difficulty: 'Easy', points: 80, icon: '📚', externalUrl: 'https://sorting-stories-game.lovable.app/', image: '/api/image/360_F_628835191_EMMgdwXxjtd3yLBUguiz5UrxaxqByvUc.jpg' },
      { name: 'Eco Arrow Harmony', category: 'climate', description: 'Follow eco-guided arrow flows to learn sustainable pathways in an interactive challenge.', difficulty: 'Medium', points: 85, icon: '🎯', externalUrl: 'https://eco-arrow-harmony.lovable.app/', image: '/api/image/golden-sunset-hd-backgrounds-captivatings-for-serene-scenes-photo.jpg' },
      { name: 'Eco Balance Grid', category: 'habits', description: 'Balance environmental choices on a grid to build smart, sustainable daily habits.', difficulty: 'Medium', points: 90, icon: '🧩', externalUrl: 'https://eco-balance-grid.lovable.app/', image: '/api/image/beautiful-morning-view-indonesia-panorama-landscape-paddy-fields-with-beauty-color-and-sky-natural-light-photo.jpg' },
      { name: 'Bad Gas Hunter', category: 'climate', description: 'Hunt down harmful emissions and boost cleaner air through fast action.', difficulty: 'Medium', points: 95, icon: '🛰️', externalUrl: 'https://badgashunter.netlify.app/', image: '/api/image/background-pictures-nature-hd-images-1920x1200-wallpaper-preview.jpg' },
      { name: 'Eco Hit', category: 'fun', description: 'Quick reflex eco challenge: hit the right sustainability targets and rack up points.', difficulty: 'Easy', points: 85, icon: '🎯', externalUrl: 'https://eco-hit.netlify.app/', image: '/api/image/nature-319.jpg' },
      { name: 'Eco Shoot', category: 'wildlife', description: 'Action-packed shooter experience with an environmental mission focus.', difficulty: 'Hard', points: 120, icon: '🚀', externalUrl: 'https://ecoshoot.netlify.app/', image: '/api/image/b1573252592009209d45a186360dea8c.jpg' },
      { name: 'Matching Pairs Date', category: 'fun', description: 'A fast memory and matching challenge with a playful date-night style twist.', difficulty: 'Easy', points: 75, icon: '💞', externalUrl: 'https://matchingpairsdate.netlify.app/', image: '/api/image/Bhpd8.jpg' },
      { name: 'Tsunami Expedition', category: 'climate', description: 'Explore wave and disaster awareness through a challenge built around environmental resilience.', difficulty: 'Medium', points: 95, icon: '🌊', externalUrl: 'https://tsunamiexp.netlify.app/', image: '/api/image/pngtree-abstract-cloudy-background-beautiful-natural-streaks-of-sky-and-clouds-red-image_15684333.jpg' },
      { name: 'Mineral Expedition', category: 'wildlife', description: 'Discover mineral-themed exploration in a guided adventure focused on terrain and earth science.', difficulty: 'Medium', points: 90, icon: '⛏️', externalUrl: 'https://mineralexp.netlify.app/', image: '/api/image/pngtree-cb-background-hd-2022-download-picsart-and-snapseed-photo-editing-picture-image_15546523.jpg' },
      { name: 'Environment Word Explorer', category: 'fun', description: 'Explore and master environmental words in a fun, educational game session.', difficulty: 'Easy', points: 80, icon: '📖', externalUrl: 'https://evironmentwordexplorer.netlify.app/', image: '/api/image/stunning-high-resolution-nature-and-landscape-backgrounds-breathtaking-scenery-in-hd-photo.jpg' },
      { name: 'AcquaMind', category: 'habits', description: 'Interactive water-awareness challenge focused on smarter use, conservation habits, and environmental impact.', difficulty: 'Medium', points: 95, icon: '💧', externalUrl: 'https://acquamind.netlify.app/', image: '/api/image/stunning-high-resolution-nature-and-landscape-backgrounds-breathtaking-scenery-in-hd-photo.jpg' },
      { name: 'NutriShot', category: 'environment', description: 'Nutrition & environmental awareness game.', difficulty: 'Easy', points: 10, icon: '🍎', externalUrl: 'https://nutrishot.netlify.app/' },
      { name: 'Environmental Multidisciplinary Game', category: 'environment', description: 'Covers multidisciplinary environmental concepts.', difficulty: 'Easy', points: 10, icon: '🌍', externalUrl: 'https://environmultioddgame.netlify.app/' },
      { name: 'Sorting Resources Game', category: 'environment', description: 'Learn waste sorting and recycling.', difficulty: 'Easy', points: 10, icon: '♻️', externalUrl: 'https://sortingresources.netlify.app/' },
      { name: 'Bio Bubble Shooter', category: 'environment', description: 'Biodiversity themed bubble shooter.', difficulty: 'Easy', points: 10, icon: '🧬', externalUrl: 'https://biobubbleshoot2.netlify.app/' },
      { name: 'Human & Environment Quiz', category: 'environment', description: 'Human-environment interaction quiz.', difficulty: 'Easy', points: 10, icon: '🧠', externalUrl: 'https://humanandenvironquiz.netlify.app/' },
      { name: 'Sustainable Quiz Game', category: 'environment', description: 'Sustainability decision-making quiz.', difficulty: 'Easy', points: 10, icon: '✅', externalUrl: 'https://sustainblequiz.netlify.app/' },
      { name: 'Bio Matching Game', category: 'environment', description: 'Match biodiversity elements.', difficulty: 'Easy', points: 10, icon: '🧩', externalUrl: 'https://biomatchinggame.netlify.app/' },
      { name: 'Pollution Matching Game', category: 'environment', description: 'Identify pollution types.', difficulty: 'Easy', points: 10, icon: '☁️', externalUrl: 'https://pollutionmatching.netlify.app/' },
      { name: 'EcoDoku Game', category: 'environment', description: 'Sudoku-based eco puzzle.', difficulty: 'Easy', points: 10, icon: '🧩', externalUrl: 'https://ecodokugame.netlify.app/' },
      { name: 'Waste Segregation', category: 'recycling', description: 'Drag items into the correct bins.', difficulty: 'Easy', points: 5, icon: '♻️', externalUrl: '/games/' },
      { name: 'Eco-Home Challenge', category: 'habits', description: 'Fix bad habits in a room.', difficulty: 'Easy', points: 8, icon: '🏠', externalUrl: '/games/' },
      { name: 'Recycling Factory Puzzle', category: 'recycling', description: 'Reorder the factory line correctly.', difficulty: 'Medium', points: 20, icon: '🏭', externalUrl: '/games/' },
      { name: 'Ocean Cleanup', category: 'recycling', description: 'Collect plastic, avoid fish.', difficulty: 'Easy', points: 10, icon: '🚤', externalUrl: '/games/' },
    ];
    // Resolve admin ID from MongoDB
    const adminUser = await mongoStorage.getUserByUsername('admin123');
    const adminId = adminUser?.id || '';
    const now = Date.now();
    const slugify = (title: string) =>
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const id = slugify(b.name || `game-${i + 1}`);
      const existingByName = await mongoStorage.findGameByName(b.name);
      const payload = {
        name: b.name,
        category: b.category,
        description: b.description || '',
        difficulty: b.difficulty,
        points: b.points,
        icon: b.icon || '',
        externalUrl: b.externalUrl || '',
        image: b.image || '',
      };

      if (existingByName) {
        await mongoStorage.updateGame(existingByName.id, payload);
        continue;
      }

      const existsById = await mongoStorage.gameIdExists(id);
      if (existsById) {
        await mongoStorage.updateGame(id, payload);
        continue;
      }

      await mongoStorage.createGame({ id, ...payload, createdAt: now + i, createdByUserId: adminId });
    }
  }

  // Seed a few sample announcements & assignments for admin and the demo teacher
  private ensureDemoAnnouncementsAssignments() {
    const now = Date.now();
    // Admin (global) samples
    const adminEntry = Array.from(this.users.entries()).find(([, u]) => u.username === 'admin123');
    if (adminEntry) {
      const [aid] = adminEntry;
      const globalAnns = Array.from(this.announcements.values()).filter(a => a.visibility === 'global');
      if (globalAnns.length < 3) {
        const samples: Array<{ title: string; body?: string }> = [
          { title: 'Global Eco Week Kickoff', body: 'Welcome to Eco Week! Participate in events and earn points.' },
          { title: 'New Global Quiz Series', body: 'Try the Global Climate Action quiz now.' },
          { title: 'Scholarships', body: 'Top eco-scorers will be considered for scholarships.' },
        ];
        samples.forEach((s, i) => {
          const id = randomUUID();
          const ann: Announcement = { id, title: s.title, body: s.body, createdAt: now + i, createdByUserId: aid, schoolId: '', visibility: 'global' };
          this.announcements.set(id, ann);
        });
        // Notify all students once for the first global item (keep it light)
        this.users.forEach((u, id) => { if (this.roles.get(id) === 'student') this.addNotificationForUserId(id, 'New global announcements available', 'announcement'); });
      }
    }

    // Teacher (school) samples
    const teacherEntry = Array.from(this.users.entries()).find(([, u]) => u.username === 'test_teacher');
    if (teacherEntry) {
      const [tid] = teacherEntry;
      // Get schoolId from teacher's profile (consistent with MongoDB)
      const teacherProfile = this.profiles.get(tid);
      const schoolId = teacherProfile?.schoolId;
      if (schoolId) {
        const teacherAnns = Array.from(this.announcements.values()).filter(a => a.createdByUserId === tid);
        if (teacherAnns.length < 3) {
          const samples: Array<{ title: string; body?: string }> = [
            { title: 'School Assembly on Monday', body: 'Please assemble by 8:30 AM in the auditorium.' },
            { title: 'Science Fair Registrations Open', body: 'Register your teams by Friday.' },
            { title: 'New Library Books Available', body: 'Visit the library to check out the latest arrivals.' },
          ];
          samples.forEach((s, i) => {
            const id = randomUUID();
            const ann: Announcement = { id, title: s.title, body: s.body, createdAt: now + i, createdByUserId: tid, schoolId, visibility: 'school' };
            this.announcements.set(id, ann);
          });
          this.notifySchool(schoolId, 'New school announcements available', 'announcement');
        }
      }
    }
  }

  private seedDefaults() {
    // Removed - no longer seeding into Maps
  }

  private buildPayload() {
    // Removed - no longer using data.json
    return {};
  }

  private async flushSave() {
    // Removed - no longer saving to data.json
  }

  private save() {
    // Removed - no longer saving to data.json
  }

  async getUser(id: string): Promise<User | undefined> {
    console.log("AUTH: using MongoDB");
    return await mongoStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log("AUTH: using MongoDB");
    return await mongoStorage.getUserByUsername(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("AUTH: using MongoDB");
    const id = randomUUID();
    const user = {
      ...insertUser,
      id,
      password: this.toHashedPassword((insertUser as any).password),
    };

    // Write user to MongoDB
    const createdUser = await mongoStorage.createUser(user);

    // Always create/update profile with schoolId in MongoDB
    await mongoStorage.upsertProfile(createdUser.id, {
      name: (insertUser as any).username,
      role: (insertUser as any).role || 'student',
      schoolId: (insertUser as any).schoolId || '',
      email: (insertUser as any).email || '',
    });

    console.log("✔️ User + Profile created in MongoDB:", createdUser.id, "schoolId:", (insertUser as any).schoolId);
    return createdUser;
  }

  // Schools - MongoDB as single source of truth
  async listSchools() {
    try {
      const mongoSchools = await mongoStorage.listSchools();
      console.log(`[School] listSchools: Found ${mongoSchools.length} schools in MongoDB`);
      return mongoSchools.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.error('❌ listSchools: MongoDB failed -', err.message);
      return [];
    }
  }

  async addSchool(name: string) {
    const trimmedName = name.trim();
    const school = await mongoStorage.getOrCreateSchoolByName(trimmedName);
    console.log(`[School] addSchool: "${trimmedName}" -> id=${school.id}`);
    return school;
  }

  async getOrCreateSchoolByName(name: string) {
    const school = await mongoStorage.getOrCreateSchoolByName(name);
    console.log(`[School] getOrCreateSchoolByName resolved: "${name}" -> schoolId=${school.id}`);
    return school;
  }

  async removeSchool(id: string) {
    try {
      const result = await MongoSchool.deleteOne({ id });
      const existed = result.deletedCount > 0;
      if (existed) {
        console.log(`[School] removeSchool: Deleted school id=${id} from MongoDB`);
      } else {
        console.warn(`[School] removeSchool: School id=${id} not found in MongoDB`);
      }
      return existed;
    } catch (err: any) {
      console.error(`❌ removeSchool: Failed to delete school id=${id} -`, err.message);
      return false;
    }
  }

  // Signups — now stored in MongoDB Application collection
  async addStudentApplication(app: StudentApplication) {
    const id = randomUUID();
    const hashedPassword = this.toHashedPassword(app.password);
    const applicationData = {
      id,
      username: app.username,
      password: hashedPassword,
      role: 'student' as const,
      name: app.name,
      email: app.email,
      schoolId: app.schoolId,
      status: 'pending' as const,
      createdAt: Date.now(),
      studentId: app.studentId,
      rollNumber: app.rollNumber,
      className: app.className,
      section: app.section,
      photoDataUrl: app.photoDataUrl,
    };
    await mongoStorage.createApplication(applicationData);
    console.log(`APPLICATION: student signup ${app.username} saved to MongoDB`);
    return { ...app, id, password: hashedPassword };
  }

  async addTeacherApplication(app: TeacherApplication) {
    const id = randomUUID();
    const hashedPassword = this.toHashedPassword(app.password);
    const applicationData = {
      id,
      username: app.username,
      password: hashedPassword,
      role: 'teacher' as const,
      name: app.name,
      email: app.email,
      schoolId: app.schoolId,
      status: 'pending' as const,
      createdAt: Date.now(),
      teacherId: app.teacherId,
      subject: app.subject,
      photoDataUrl: app.photoDataUrl,
    };
    await mongoStorage.createApplication(applicationData);
    console.log(`APPLICATION: teacher signup ${app.username} saved to MongoDB`);
    return { ...app, id, password: hashedPassword };
  }

  async listPending() {
    const [students, teachers] = await Promise.all([
      mongoStorage.listPendingApplications('student'),
      mongoStorage.listPendingApplications('teacher'),
    ]);
    return { students, teachers };
  }

  async approveApplication(type: "student" | "teacher", id: string) {
    console.log("AUTH: using MongoDB");
    // Fetch application from MongoDB
    const app = await mongoStorage.getApplicationById(id);
    if (!app) {
      console.log(`AUTH: application ${id} not found in MongoDB`);
      return false;
    }

    const userId = randomUUID();
    const hashedPassword = app.password; // already hashed at signup

    // Write user to MongoDB
    const { User: MongoUserModel } = await import('./models/User');
    await MongoUserModel.create({ id: userId, username: app.username, password: hashedPassword });

    // Write profile to MongoDB
    const profileFields: any = {
      id: userId,
      role: app.role,
      name: app.name,
      email: app.email,
      schoolId: app.schoolId,
      photoDataUrl: app.photoDataUrl,
    };
    if (app.role === 'student') {
      profileFields.studentId = app.studentId;
      profileFields.rollNumber = app.rollNumber;
      profileFields.className = app.className;
      profileFields.section = app.section;
    } else {
      profileFields.teacherId = app.teacherId;
      profileFields.subject = app.subject;
    }
    await MongoProfile.updateOne({ id: userId }, { $set: profileFields }, { upsert: true });

    // Delete the application from MongoDB (it's been processed)
    await mongoStorage.deleteApplication(id);

    console.log(`AUTH: approved ${app.role} ${app.username} (id=${userId}) written to MongoDB`);
    return true;
  }

  async rejectStudent(id: string): Promise<boolean> {
    console.log("ADMIN: rejected student application", id);
    return await mongoStorage.deleteApplication(id);
  }

  async rejectTeacher(id: string): Promise<boolean> {
    console.log("ADMIN: rejected teacher application", id);
    return await mongoStorage.deleteApplication(id);
  }

  async isUsernameAvailable(username: string) {
    console.log("AUTH: using MongoDB");
    // Check MongoDB approved users
    const takenInMongo = !(await mongoStorage.isUsernameAvailable(username));
    if (takenInMongo) return false;
    // Check MongoDB pending applications
    const inPending = await mongoStorage.isUsernameInPendingApplications(username);
    return !inPending;
  }

  async getApplicationStatus(username: string) {
    console.log("AUTH: using MongoDB");
    // Check MongoDB for approved users
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (mongoUser) return "approved";
    // Check MongoDB pending applications
    const pending = await mongoStorage.getApplicationByUsername(username);
    return pending ? "pending" : "none";
  }

  async saveOtp(email: string, code: string, ttlMs: number) {
    const key = email.trim().toLowerCase();
    const sanitized = String(code).replace(/\D/g, '').slice(0, 6);
    this.otps.set(key, { code: sanitized, expires: Date.now() + ttlMs });
  }

  async verifyOtp(email: string, code: string) {
    const key = email.trim().toLowerCase();
    const sanitized = String(code).replace(/\D/g, '').slice(0, 6);
    const rec = this.otps.get(key);
    if (!rec) return false;
    const ok = rec.code === sanitized && Date.now() <= rec.expires;
    // if (ok) this.otps.delete(key);
    return ok;
  }

  async resetPassword(username: string, password: string) {
    console.log("AUTH: using MongoDB");
    const { User: MongoUserModel } = await import('./models/User');
    const newHash = this.toHashedPassword(password);
    const result = await MongoUserModel.updateOne({ username }, { $set: { password: newHash } });
    if (result.matchedCount === 0) return false;
    // Keep in-memory in sync
    const memFound = Array.from(this.users.values()).find(u => u.username === username);
    if (memFound) {
      this.users.set(memFound.id, { ...memFound, password: newHash });
      this.save();
    }
    return true;
  }

  async unapproveUser(username: string) {
    // find user by username
    const entry = Array.from(this.users.entries()).find(([, u]) => u.username === username);
    if (!entry) return false;
    const [id, user] = entry;
    const role = this.roles.get(id);
    if (role !== 'student' && role !== 'teacher') return false; // don't unapprove admins

    // remove from approved users (memory)
    this.users.delete(id);
    this.roles.delete(id);
    const prof = this.profiles.get(id);
    this.profiles.delete(id);
    this.save();

    // Also remove from MongoDB User + Profile
    const { User: MongoUserModel } = await import('./models/User');
    await MongoUserModel.deleteOne({ username });
    await MongoProfile.deleteOne({ id });

    // Push back to pending as a MongoDB Application
    const pendingId = randomUUID();
    const applicationData: any = {
      id: pendingId,
      username,
      password: user.password, // already hashed
      role,
      name: prof?.name || '',
      email: prof?.email || '',
      schoolId: prof?.schoolId || '',
      status: 'pending' as const,
      createdAt: Date.now(),
      photoDataUrl: prof?.photoDataUrl,
    };
    if (role === 'student') {
      applicationData.studentId = prof?.studentId || 'REVIEW';
      applicationData.rollNumber = prof?.rollNumber || '';
      applicationData.className = prof?.className || '';
      applicationData.section = prof?.section || '';
    } else {
      applicationData.teacherId = prof?.teacherId || 'REVIEW';
      applicationData.subject = prof?.subject || '';
    }
    await mongoStorage.createApplication(applicationData);
    console.log(`APPLICATION: ${username} unapproved and moved back to pending in MongoDB`);
    return true;
  }

  async getUserDetails(username: string): Promise<any> {
    // Approved users in memory
    const approvedEntry = Array.from(this.users.entries()).find(([, u]) => u.username === username);
    if (approvedEntry) {
      const [id, u] = approvedEntry;
      const role = this.roles.get(id) || 'student';
      const profile = this.profiles.get(id) || {};
      return {
        status: 'approved',
        username: u.username,
        role,
        name: profile.name,
        email: profile.email,
        schoolId: profile.schoolId,
        studentId: profile.studentId,
        teacherId: profile.teacherId,
        subject: profile.subject,
        rollNumber: profile.rollNumber,
        className: profile.className,
        section: profile.section,
        photoDataUrl: profile.photoDataUrl,
      };
    }

    // Fallback to MongoDB-approved users if memory is stale
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (mongoUser) {
      const profile = await mongoStorage.getProfileById(mongoUser.id);
      return {
        status: 'approved',
        username: mongoUser.username,
        role: profile?.role || 'student',
        name: profile?.name || '',
        email: profile?.email || '',
        schoolId: profile?.schoolId || '',
        studentId: profile?.studentId,
        teacherId: profile?.teacherId,
        subject: profile?.subject,
        rollNumber: profile?.rollNumber,
        className: profile?.className,
        section: profile?.section,
        photoDataUrl: profile?.photoDataUrl,
      };
    }

    // Pending applications from MongoDB
    const pending = await mongoStorage.getApplicationByUsername(username);
    if (pending) {
      const { password, ...rest } = pending;
      return { status: 'pending', ...rest };
    }
    return { status: 'none', username };
  }

  // ===== Profiles (self) =====
  private findUserIdByUsername(username: string): string | null {
    const e = Array.from(this.users.entries()).find(([, u]) => u.username === username);
    return e ? e[0] : null;
  }

  async getOwnProfile(username: string): Promise<ProfilePayload | null> {
    return await mongoStorage.getOwnProfile(username);
  }

  async updateOwnProfile(username: string, updates: Partial<ProfileUpsert>): Promise<{ ok: true; profile: ProfilePayload } | { ok: false; error: string }> {
    return await mongoStorage.updateOwnProfile(username, updates);
  }

  private async getQuizStatsAndTimelineForUser(userId: string): Promise<{ points: number; attempts: number; timeline: TimelineItem[] }> {
    const attempts = await MongoQuizAttempt.find({ userId }).lean();
    if (!attempts.length) return { points: 0, attempts: 0, timeline: [] };

    const quizIds = Array.from(new Set(attempts.map((a: any) => String(a.quizId || '')).filter(Boolean)));
    const quizzes = quizIds.length
      ? await MongoQuiz.find({ id: { $in: quizIds } }).select({ id: 1, title: 1, points: 1 }).lean()
      : [];
    const quizById = new Map<string, { title: string; points: number }>();
    for (const q of quizzes as any[]) {
      quizById.set(String(q.id), { title: String(q.title || 'Quiz'), points: Number(q.points || 0) });
    }

    let points = 0;
    const timeline: TimelineItem[] = [];
    for (const attempt of attempts as any[]) {
      const quiz = quizById.get(String(attempt.quizId || ''));
      if (!quiz) continue;
      points += Number(quiz.points || 0);
      timeline.push({
        kind: 'quiz',
        when: Number(attempt.submittedAt || 0),
        title: quiz.title,
        scorePercent: Number(attempt.score || 0),
        points: quiz.points,
      });
    }

    return { points, attempts: attempts.length, timeline };
  }

  private async getTeacherQuizStats(teacherUserId: string): Promise<{ quizzesCreated: number; ecoPoints: number }> {
    const quizzes = await MongoQuiz.find({ createdByUserId: teacherUserId, visibility: 'school' }).select({ id: 1, points: 1 }).lean();
    if (!quizzes.length) return { quizzesCreated: 0, ecoPoints: 0 };

    const quizById = new Map<string, number>();
    for (const quiz of quizzes as any[]) quizById.set(String(quiz.id), Number(quiz.points || 0));

    const attempts = await MongoQuizAttempt.find({ quizId: { $in: Array.from(quizById.keys()) } }).select({ quizId: 1 }).lean();
    let ecoPoints = 0;
    for (const attempt of attempts as any[]) {
      ecoPoints += Number(quizById.get(String(attempt.quizId || '')) || 0);
    }

    return { quizzesCreated: quizzes.length, ecoPoints };
  }

  // ===== Student Profile View =====
  async getStudentProfile(username: string): Promise<StudentProfileView | null> {
    const cached = this.studentProfileCache.get(username);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.profile;
    }

    const user = await this.mongoStorage.getUserByUsername(username);
    if (!user) return null;

    const profile = await this.mongoStorage.getOwnProfile(username);
    if (!profile || profile.role !== 'student') return null;

    const uid = user.id;
    const [submissionStats, quizStats, lessonCompletions, gamePlays, unreadNotifications] = await Promise.all([
      mongoStorage.getStudentSubmissionStats(username),
      this.getQuizStatsAndTimelineForUser(uid),
      mongoStorage.listLessonCompletions(uid),
      mongoStorage.getAllGamePlaysForUser(uid),
      mongoStorage.countUnreadNotifications(uid),
    ]);

    let ecoPoints = submissionStats.ecoPoints + quizStats.points;
    const timeline: TimelineItem[] = [...submissionStats.timeline, ...quizStats.timeline];

    for (const lc of lessonCompletions) {
      ecoPoints += Number(lc.points || 0);
      timeline.push({
        kind: 'lesson',
        when: lc.completedAt,
        title: `${lc.moduleTitle}: ${lc.lessonTitle}`,
        points: lc.points,
        moduleId: lc.moduleId,
        lessonId: lc.lessonId,
      });
    }

    let gamesPlayedTotal = 0;
    const uniqueGameIds = new Set<string>();
    for (const gp of gamePlays) {
      ecoPoints += Number(gp.points || 0);
      uniqueGameIds.add(String(gp.gameId));
      gamesPlayedTotal += 1;
      timeline.push({
        kind: 'game',
        when: gp.playedAt,
        title: gp.gameId,
        points: gp.points,
      });
    }

    timeline.sort((a, b) => (b.when || 0) - (a.when || 0));
    const trimmedTimeline = timeline.slice(0, 20);

    const ecoTreeStage = ecoPoints >= 500 ? 'Big Tree' : ecoPoints >= 100 ? 'Small Tree' : 'Seedling';
    const achievements: Array<{ key: string; name: string; unlocked: boolean }> = [
      { key: 'first_task', name: 'First Task Completed', unlocked: ecoPoints > 0 },
      { key: 'top10_school', name: 'Top 10 in School', unlocked: false },
      { key: 'quiz_master', name: 'Quiz Master', unlocked: quizStats.attempts >= 3 },
    ];

    const { ranks, leaderboardNext } = await this.computeStudentRankData(uid, profile.schoolId);
    if (ranks.school && ranks.school > 0 && ranks.school <= 10) {
      const idx = achievements.findIndex(a => a.key === 'top10_school');
      if (idx >= 0) achievements[idx] = { ...achievements[idx], unlocked: true };
    }

    const week = await this.computeWeeklyStreak(uid);
    const result: StudentProfileView = {
      username: user.username,
      name: profile.name || '',
      schoolId: profile.schoolId || '',
      ecoPoints,
      ecoTreeStage,
      achievements,
      timeline: trimmedTimeline,
      ranks,
      allowExternalView: profile.allowExternalView || false,
      week,
      leaderboardNext,
      profileCompletion: this.computeProfileCompletion(profile),
      unreadNotifications,
      gamesPlayedTotal,
      uniqueGamesPlayed: uniqueGameIds.size,
    };

    this.studentProfileCache.set(username, { expiresAt: Date.now() + 15000, profile: result });
    return result;
  }

  private async computeStudentRankData(uid: string, schoolId: string) {
    const students = await MongoProfile.find({ role: 'student' }).select({ id: 1, schoolId: 1 }).lean();
    const studentIds = Array.from(new Set(students.map((s: any) => String(s.id))));
    if (!studentIds.length) {
      return { ranks: { global: null, school: null }, leaderboardNext: null };
    }

    const users = await MongoUser.find({ id: { $in: studentIds } }).select({ id: 1, username: 1 }).lean();
    const usernameById = new Map<string, string>(
      (users as any[]).map((u: any) => [String(u.id), String(u.username || '')])
    );

    const [submissionTotals, quizTotals, lessonTotals, gameTotals] = await Promise.all([
      MongoSubmission.aggregate([
        { $match: { studentUserId: { $in: studentIds }, status: 'approved' } },
        { $group: { _id: '$studentUserId', points: { $sum: '$points' } } },
      ]),
      MongoQuizAttempt.aggregate([
        { $match: { userId: { $in: studentIds } } },
        { $lookup: { from: 'quizzes', localField: 'quizId', foreignField: 'id', as: 'quiz' } },
        { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$userId', points: { $sum: '$quiz.points' } } },
      ]),
      MongoLessonCompletion.aggregate([
        { $match: { studentUserId: { $in: studentIds } } },
        { $group: { _id: '$studentUserId', points: { $sum: '$points' } } },
      ]),
      MongoGamePlay.aggregate([
        { $match: { studentUserId: { $in: studentIds }, points: { $gt: 0 } } },
        { $group: { _id: '$studentUserId', points: { $sum: '$points' } } },
      ]),
    ]);

    const scoreByStudent = new Map<string, number>();
    for (const row of submissionTotals as any[]) {
      scoreByStudent.set(String(row._id), Number(row.points || 0));
    }
    for (const row of quizTotals as any[]) {
      scoreByStudent.set(String(row._id), (scoreByStudent.get(String(row._id)) || 0) + Number(row.points || 0));
    }
    for (const row of lessonTotals as any[]) {
      scoreByStudent.set(String(row._id), (scoreByStudent.get(String(row._id)) || 0) + Number(row.points || 0));
    }
    for (const row of gameTotals as any[]) {
      scoreByStudent.set(String(row._id), (scoreByStudent.get(String(row._id)) || 0) + Number(row.points || 0));
    }

    const ranked = students
      .map((student: any) => ({
        id: String(student.id),
        username: usernameById.get(String(student.id)) || 'unknown',
        schoolId: student.schoolId || '',
        points: scoreByStudent.get(String(student.id)) || 0,
      }))
      .sort((a, b) => b.points - a.points);

    const currentIndex = ranked.findIndex(r => r.id === uid);
    const globalRank = currentIndex >= 0 ? currentIndex + 1 : null;
    const schoolRankList = ranked.filter(r => r.schoolId === schoolId);
    const schoolIndex = schoolRankList.findIndex(r => r.id === uid);
    const schoolRank = schoolIndex >= 0 ? schoolIndex + 1 : null;
    const leaderboardNext = currentIndex > 0 ? { username: ranked[currentIndex - 1].username, points: ranked[currentIndex - 1].points } : null;

    return { ranks: { global: globalRank, school: schoolRank }, leaderboardNext };
  }

  // ===== Leaderboard helpers =====
  async getGlobalSchoolsLeaderboard(limit = 25) {
    // Use MongoDB aggregation to calculate school leaderboards
    const pipeline = [
      { $match: { status: 'approved' } },
      { $project: { studentUserId: 1, points: 1, source: 'submission' } },
      { $unionWith: {
          coll: 'gameplays',
          pipeline: [
            { $match: { points: { $gt: 0 } } },
            { $project: { studentUserId: 1, points: 1, source: 'game' } }
          ]
        }
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'studentUserId',
          foreignField: 'id',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$profile.schoolId',
          ecoPoints: { $sum: '$points' },
          students: { $addToSet: '$studentUserId' }
        }
      },
      // Count unique students per school
      {
        $addFields: {
          studentCount: { $size: '$students' }
        }
      },
      // Lookup school name
      {
        $lookup: {
          from: 'schools',
          localField: '_id',
          foreignField: 'id',
          as: 'school'
        }
      },
      { $unwind: { path: '$school', preserveNullAndEmptyArrays: false } },
      // Sort by ecoPoints descending
      { $sort: { ecoPoints: -1 } },
      // Limit results
      { $limit: Math.max(1, Math.min(500, limit || 25)) }
    ];

    const results = await MongoSubmission.aggregate(pipeline as any);
    const resultsBySchool = new Map((results as any[]).map((row: any) => [String(row._id), row]));

    const allSchools = await MongoSchool.find({}).select({ id: 1, name: 1 }).lean();
    const schoolRows = await Promise.all(allSchools.map(async (school: any) => {
      const schoolId = String(school.id || '');
      const schoolName = String(school.name || 'Unknown School');
      const result = resultsBySchool.get(schoolId);
      const ecoPoints = Number(result?.ecoPoints || 0);
      const studentCount = Number(result?.studentCount || 0);

      let topStudent;
      if (ecoPoints > 0 || studentCount > 0) {
        const topStudentPipeline = [
          { $match: { status: 'approved' } },
          { $project: { studentUserId: 1, points: 1 } },
          { $unionWith: {
              coll: 'gameplays',
              pipeline: [
                { $match: { points: { $gt: 0 } } },
                { $project: { studentUserId: 1, points: 1 } }
              ]
            }
          },
          {
            $lookup: {
              from: 'profiles',
              localField: 'studentUserId',
              foreignField: 'id',
              as: 'profile'
            }
          },
          { $unwind: { path: '$profile', preserveNullAndEmptyArrays: false } },
          { $match: { 'profile.schoolId': schoolId } },
          {
            $group: {
              _id: '$studentUserId',
              totalPoints: { $sum: '$points' },
              profile: { $first: '$profile' }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: 'id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          { $sort: { totalPoints: -1 } },
          { $limit: 1 }
        ];

        const topStudentResult = await MongoSubmission.aggregate(topStudentPipeline as any);
        if (topStudentResult.length > 0) {
          topStudent = {
            username: topStudentResult[0].user.username,
            name: topStudentResult[0].profile.name,
            ecoPoints: topStudentResult[0].totalPoints
          };
        }
      }

      return {
        schoolId,
        schoolName,
        ecoPoints,
        students: studentCount,
        topStudent
      };
    }));

    return schoolRows
      .sort((a, b) => b.ecoPoints - a.ecoPoints || a.schoolName.localeCompare(b.schoolName))
      .slice(0, Math.max(1, Math.min(500, limit || 25)));
  }

  async getSchoolStudentsLeaderboard(schoolId: string, limit = 50, offset = 0) {
    const debugPrefix = `[Leaderboard][SchoolStudents][schoolId=${schoolId}]`;

    const studentQuery: any = { role: 'student', schoolId };
    const studentCount = await MongoProfile.countDocuments(studentQuery);
    const studentProfiles = await MongoProfile.find(studentQuery).select({ id: 1, name: 1, schoolId: 1 }).lean();
    const studentIds = studentProfiles.map((student: any) => String(student.id));
    const userDocs = await MongoUser.find({ id: { $in: studentIds } }).select({ id: 1 }).lean();
    const userCount = userDocs.length;
    const matchedStudentCount = userCount;
    const profileSamples = studentProfiles.slice(0, 3).map((student: any) => String(student.id));
    const submissionSamples = await MongoSubmission.find({ studentUserId: { $in: studentIds }, status: 'approved' }).select({ studentUserId: 1 }).limit(3).lean();
    const quizAttemptSamples = await MongoQuizAttempt.find({ userId: { $in: studentIds } }).select({ userId: 1 }).limit(3).lean();
    const lessonCompletionSamples = await MongoLessonCompletion.find({ studentUserId: { $in: studentIds } }).select({ studentUserId: 1 }).limit(3).lean();
    const submissionsCount = studentIds.length
      ? await MongoSubmission.countDocuments({ studentUserId: { $in: studentIds }, status: 'approved' })
      : 0;
    const quizAttemptsCount = studentIds.length
      ? await MongoQuizAttempt.countDocuments({ userId: { $in: studentIds } })
      : 0;
    const lessonCompletionsCount = studentIds.length
      ? await MongoLessonCompletion.countDocuments({ studentUserId: { $in: studentIds } })
      : 0;

    console.log(`${debugPrefix} profile studentCount=${studentCount}, userCount=${userCount}, matchedStudentCount=${matchedStudentCount}, submissions=${submissionsCount}, quizAttempts=${quizAttemptsCount}, lessonCompletions=${lessonCompletionsCount}`);
    console.log(`${debugPrefix} sample profile ids=${JSON.stringify(profileSamples)}`);
    console.log(`${debugPrefix} sample submission.studentUserId=${JSON.stringify(submissionSamples.map((doc: any) => doc.studentUserId))}`);
    console.log(`${debugPrefix} sample quizAttempt.userId=${JSON.stringify(quizAttemptSamples.map((doc: any) => doc.userId))}`);
    console.log(`${debugPrefix} sample lessonCompletion.studentUserId=${JSON.stringify(lessonCompletionSamples.map((doc: any) => doc.studentUserId))}`);
    if (studentCount === 0) {
      const distinctSchoolIds = await MongoProfile.distinct('schoolId', { role: 'student' });
      console.log(`${debugPrefix} no matching students found. distinct student schoolIds sample=${JSON.stringify(distinctSchoolIds.slice(0, 20))}`);
    }

    const pipeline = [
      { $match: studentQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'id',
          foreignField: 'id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'submissions',
          let: { studentId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$studentUserId', '$$studentId'] },
                    { $eq: ['$status', 'approved'] }
                  ]
                }
              }
            },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'submissions'
        }
      },
      {
        $lookup: {
          from: 'quizattempts',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$studentId'] } } },
            {
              $lookup: {
                from: 'quizzes',
                localField: 'quizId',
                foreignField: 'id',
                as: 'quiz'
              }
            },
            { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, totalPoints: { $sum: '$quiz.points' } } }
          ],
          as: 'quizAttempts'
        }
      },
      {
        $lookup: {
          from: 'lessoncompletions',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$studentUserId', '$$studentId'] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'lessons'
        }
      },
      {
        $lookup: {
          from: 'gameplays',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$studentUserId', '$$studentId'] }, { $gt: ['$points', 0] } ] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'gameplays'
        }
      },
      {
        $addFields: {
          ecoPoints: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ['$submissions.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$quizAttempts.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$lessons.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$gameplays.totalPoints', 0] }, 0] }
            ]
          }
        }
      },
      { $sort: { ecoPoints: -1 } },
      { $skip: Math.max(0, offset || 0) },
      { $limit: Math.max(1, Math.min(200, limit || 50)) },
      {
        $project: {
          username: { $ifNull: ['$user.username', 'unknown'] },
          name: '$name',
          ecoPoints: 1
        }
      }
    ];

    console.log(`${debugPrefix} aggregation pipeline = ${JSON.stringify(pipeline, null, 2)}`);
    const results = await MongoProfile.aggregate(pipeline as any);
    console.log(`${debugPrefix} aggregation results count=${results.length}`);
    if (results.length > 0) {
      console.log(`${debugPrefix} first result sample: id=${results[0].id}, username=${results[0].username}, ecoPoints=${results[0].ecoPoints}`);
      console.log(`${debugPrefix} first result submissions=${JSON.stringify(results[0].submissions)}, quizAttempts=${JSON.stringify(results[0].quizAttempts)}, lessons=${JSON.stringify(results[0].lessons)}`);
    }
    return results;
  }

  async getStudentPreview(targetUsername: string) {
    // Use MongoDB to get student preview
    const user = await mongoStorage.getUserByUsername(targetUsername);
    if (!user) return null;

    const profile = await mongoStorage.getOwnProfile(targetUsername);
    if (!profile || profile.role !== 'student') return null;

    // Calculate eco points using MongoDB aggregation
    const pipeline = [
      { $match: { id: user.id } },
      // Get submissions points
      {
        $lookup: {
          from: 'submissions',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$studentUserId', '$$studentId'] }, { $eq: ['$status', 'approved'] }] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'submissions'
        }
      },
      // Get quiz points
      {
        $lookup: {
          from: 'quizattempts',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$studentId'] } } },
            {
              $lookup: {
                from: 'quizzes',
                localField: 'quizId',
                foreignField: 'id',
                as: 'quiz'
              }
            },
            { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, totalPoints: { $sum: '$quiz.points' } } }
          ],
          as: 'quizAttempts'
        }
      },
      // Get lesson points
      {
        $lookup: {
          from: 'lessoncompletions',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$studentUserId', '$$studentId'] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'lessons'
        }
      },
      {
        $lookup: {
          from: 'gameplays',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$studentUserId', '$$studentId'] }, { $gt: ['$points', 0] } ] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'gameplays'
        }
      },
      // Sum all points
      {
        $addFields: {
          ecoPoints: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ['$submissions.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$quizAttempts.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$lessons.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$gameplays.totalPoints', 0] }, 0] }
            ]
          }
        }
      },
      {
        $project: {
          ecoPoints: 1,
          schoolId: '$schoolId'
        }
      }
    ];

    const result = await MongoProfile.aggregate(pipeline as any);
    const ecoPoints = result.length > 0 ? result[0].ecoPoints : 0;

    return {
      username: targetUsername,
      name: profile.name,
      ecoPoints,
      schoolId: profile.schoolId
    };
  }

  private getSchoolNameFromProfileSchoolId(rawSchoolId?: string): string | undefined {
    const value = String(rawSchoolId || '').trim();
    if (!value) return undefined;

    const byId = this.schools.get(value);
    if (byId?.name) return byId.name;

    const normalized = value.toLowerCase();
    const byName = Array.from(this.schools.values()).find((s) => s.name.trim().toLowerCase() === normalized);
    if (byName?.name) return byName.name;

    // Do not return raw IDs as display names.
    return undefined;
  }

  async getGlobalStudentsLeaderboard(limit = 50, offset = 0, schoolIdFilter: string | null = null) {
    const debugPrefix = `[Leaderboard][GlobalStudents][schoolIdFilter=${schoolIdFilter || 'none'}]`;
    const matchQuery: any = { role: 'student' };
    if (schoolIdFilter) matchQuery.schoolId = schoolIdFilter;

    const studentCount = await MongoProfile.countDocuments(matchQuery);
    const studentProfiles = await MongoProfile.find(matchQuery).select({ id: 1, name: 1, schoolId: 1 }).lean();
    const studentIds = studentProfiles.map((student: any) => String(student.id));
    const userDocs = await MongoUser.find({ id: { $in: studentIds } }).select({ id: 1 }).lean();
    const userCount = userDocs.length;
    const matchedStudentCount = userCount;
    const profileSamples = studentProfiles.slice(0, 3).map((student: any) => String(student.id));
    const submissionSamples = await MongoSubmission.find({ studentUserId: { $in: studentIds }, status: 'approved' }).select({ studentUserId: 1 }).limit(3).lean();
    const quizAttemptSamples = await MongoQuizAttempt.find({ userId: { $in: studentIds } }).select({ userId: 1 }).limit(3).lean();
    const lessonCompletionSamples = await MongoLessonCompletion.find({ studentUserId: { $in: studentIds } }).select({ studentUserId: 1 }).limit(3).lean();
    const submissionsCount = studentIds.length
      ? await MongoSubmission.countDocuments({ studentUserId: { $in: studentIds }, status: 'approved' })
      : 0;
    const quizAttemptsCount = studentIds.length
      ? await MongoQuizAttempt.countDocuments({ userId: { $in: studentIds } })
      : 0;
    const lessonCompletionsCount = studentIds.length
      ? await MongoLessonCompletion.countDocuments({ studentUserId: { $in: studentIds } })
      : 0;

    console.log(`${debugPrefix} profileCount=${studentCount}, userCount=${userCount}, matchedStudentCount=${matchedStudentCount}, submissions=${submissionsCount}, quizAttempts=${quizAttemptsCount}, lessonCompletions=${lessonCompletionsCount}`);
    console.log(`${debugPrefix} sample profile ids=${JSON.stringify(profileSamples)}`);
    console.log(`${debugPrefix} sample submission.studentUserId=${JSON.stringify(submissionSamples.map((doc: any) => doc.studentUserId))}`);
    console.log(`${debugPrefix} sample quizAttempt.userId=${JSON.stringify(quizAttemptSamples.map((doc: any) => doc.userId))}`);
    console.log(`${debugPrefix} sample lessonCompletion.studentUserId=${JSON.stringify(lessonCompletionSamples.map((doc: any) => doc.studentUserId))}`);
    if (studentCount === 0) {
      const distinctSchoolIds = await MongoProfile.distinct('schoolId', { role: 'student' });
      console.log(`${debugPrefix} no matching students found. distinct student schoolIds sample=${JSON.stringify(distinctSchoolIds.slice(0, 20))}`);
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'id',
          foreignField: 'id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'submissions',
          let: { studentId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$studentUserId', '$$studentId'] },
                    { $eq: ['$status', 'approved'] }
                  ]
                }
              }
            },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'submissions'
        }
      },
      {
        $lookup: {
          from: 'quizattempts',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$studentId'] } } },
            {
              $lookup: {
                from: 'quizzes',
                localField: 'quizId',
                foreignField: 'id',
                as: 'quiz'
              }
            },
            { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, totalPoints: { $sum: '$quiz.points' } } }
          ],
          as: 'quizAttempts'
        }
      },
      {
        $lookup: {
          from: 'lessoncompletions',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$studentUserId', '$$studentId'] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'lessons'
        }
      },
      {
        $lookup: {
          from: 'gameplays',
          let: { studentId: '$id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$studentUserId', '$$studentId'] }, { $gt: ['$points', 0] } ] } } },
            { $group: { _id: null, totalPoints: { $sum: '$points' } } }
          ],
          as: 'gameplays'
        }
      },
      {
        $addFields: {
          ecoPoints: {
            $add: [
              { $ifNull: [{ $arrayElemAt: ['$submissions.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$quizAttempts.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$lessons.totalPoints', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$gameplays.totalPoints', 0] }, 0] }
            ]
          }
        }
      },
      { $sort: { ecoPoints: -1 } },
      { $skip: Math.max(0, offset || 0) },
      { $limit: Math.max(1, Math.min(500, limit || 50)) },
      {
        $project: {
          username: { $ifNull: ['$user.username', 'unknown'] },
          name: '$name',
          schoolId: 1,
          ecoPoints: 1
        }
      }
    ];

    console.log(`${debugPrefix} aggregation pipeline = ${JSON.stringify(pipeline, null, 2)}`);
    const aggResults = await MongoProfile.aggregate(pipeline as any);
    const schoolIds = Array.from(new Set((aggResults as any[]).map((row) => String(row.schoolId || '')).filter(Boolean)));
    const schoolDocs = schoolIds.length
      ? await MongoSchool.find({ id: { $in: schoolIds } }).select({ id: 1, name: 1 }).lean()
      : [];
    const schoolNameById = new Map<string, string>((schoolDocs as any[]).map((s: any) => [String(s.id), String(s.name || '')]));
    const rows = (aggResults as any[]).map((row) => ({
      username: row.username,
      name: row.name,
      schoolId: row.schoolId,
      schoolName: schoolNameById.get(String(row.schoolId || '')) || this.getSchoolNameFromProfileSchoolId(row.schoolId),
      ecoPoints: row.ecoPoints || 0,
      achievements: [],
      snapshot: { tasksApproved: 0, quizzesCompleted: 0 }
    }));
    console.log(`${debugPrefix} aggregation results count=${rows.length}`);
    if (rows.length > 0) {
      console.log(`${debugPrefix} first row sample: username=${rows[0].username}, ecoPoints=${rows[0].ecoPoints}, schoolId=${rows[0].schoolId}`);
    }
    return rows;
  }

  async getGlobalTeachersLeaderboard(limit = 50, offset = 0, schoolIdFilter: string | null = null) {
    const debugPrefix = '[getGlobalTeachersLeaderboard]';
    console.log(`${debugPrefix} starting with limit=${limit}, offset=${offset}, schoolIdFilter=${schoolIdFilter}`);

    const teacherProfileMatch: any = { role: 'teacher' };
    if (schoolIdFilter) teacherProfileMatch.schoolId = schoolIdFilter;

    const teacherProfiles = await MongoProfile.find(teacherProfileMatch).select({ id: 1, name: 1, schoolId: 1 }).lean();
    const teacherProfileById = new Map<string, any>((teacherProfiles as any[]).map((p: any) => [String(p.id), p]));
    const approvedTeacherApps = await MongoApplication.find({ role: 'teacher', status: 'approved' })
      .select({ username: 1, name: 1, schoolId: 1 })
      .lean();
    const appByUsername = new Map<string, any>((approvedTeacherApps as any[]).map((app: any) => [String(app.username), app]));

    // Fallback sources ensure teachers still appear if role profile was not migrated consistently.
    const taskTeacherIds = (await MongoTask.distinct('createdByUserId')).map((id: any) => String(id || '')).filter(Boolean);
    const quizTeacherIds = (await MongoQuiz.distinct('createdByUserId')).map((id: any) => String(id || '')).filter(Boolean);
    const teacherIds = Array.from(new Set([
      ...(teacherProfiles as any[]).map((p: any) => String(p.id)),
      ...taskTeacherIds,
      ...quizTeacherIds,
    ])).filter(Boolean);

    const users = teacherIds.length
      ? await MongoUser.find({ id: { $in: teacherIds } }).select({ id: 1, username: 1 }).lean()
      : [];
    const userById = new Map<string, any>((users as any[]).map((u: any) => [String(u.id), u]));
    const appTeacherIds = (users as any[])
      .filter((u: any) => appByUsername.has(String(u.username)))
      .map((u: any) => String(u.id));
    const finalTeacherIds = Array.from(new Set([...teacherIds, ...appTeacherIds])).filter(Boolean);

    const schoolDocs = await MongoSchool.find({}).select({ id: 1, name: 1 }).lean();
    const schoolNameById = new Map<string, string>((schoolDocs as any[]).map((s: any) => [String(s.id), String(s.name || '')]));

    console.log(`${debugPrefix} candidates=${finalTeacherIds.length}, profiles=${teacherProfiles.length}, users=${users.length}, approvedApps=${approvedTeacherApps.length}`);

    const computed = await Promise.all(finalTeacherIds.map(async (teacherId) => {
      const profile = teacherProfileById.get(teacherId);
      const taskSchool = await MongoTask.findOne({ createdByUserId: teacherId }).select({ schoolId: 1 }).lean();
      const quizSchool = await MongoQuiz.findOne({ createdByUserId: teacherId }).select({ schoolId: 1 }).lean();
      const usernameFromUser = String(userById.get(teacherId)?.username || '');
      const app = usernameFromUser ? appByUsername.get(usernameFromUser) : undefined;
      const inferredSchoolId = String(profile?.schoolId || taskSchool?.schoolId || quizSchool?.schoolId || app?.schoolId || '').trim();
      if (schoolIdFilter && inferredSchoolId !== String(schoolIdFilter)) return null;

      const username = String(usernameFromUser || `teacher-${teacherId.slice(0, 8)}`);
      const tasksCreated = await MongoTask.countDocuments({ createdByUserId: teacherId });
      const quizzesCreated = await MongoQuiz.countDocuments({ createdByUserId: teacherId });

      const taskIds = tasksCreated
        ? (await MongoTask.find({ createdByUserId: teacherId }).distinct('id')).map((id: any) => String(id))
        : [];
      const taskPointsAgg = taskIds.length
        ? await MongoSubmission.aggregate([
          { $match: { taskId: { $in: taskIds }, status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$points' } } }
        ] as any)
        : [];
      const taskPoints = Number(taskPointsAgg[0]?.total || 0);

      const quizIds = quizzesCreated
        ? (await MongoQuiz.find({ createdByUserId: teacherId }).select({ id: 1, points: 1 }).lean())
        : [];
      const quizIdList = (quizIds as any[]).map((q: any) => String(q.id)).filter(Boolean);
      const quizPointsById = new Map<string, number>((quizIds as any[]).map((q: any) => [String(q.id), Number(q.points || 0)]));
      const attemptsByQuiz = quizIdList.length
        ? await MongoQuizAttempt.aggregate([
          { $match: { quizId: { $in: quizIdList } } },
          { $group: { _id: '$quizId', attempts: { $sum: 1 } } }
        ] as any)
        : [];
      let quizPoints = 0;
      for (const doc of attemptsByQuiz as any[]) {
        const quizId = String(doc._id || '');
        quizPoints += Number(doc.attempts || 0) * Number(quizPointsById.get(quizId) || 0);
      }

      const schoolId = inferredSchoolId || undefined;
      const schoolName = schoolId
        ? (schoolNameById.get(schoolId) || this.getSchoolNameFromProfileSchoolId(schoolId))
        : undefined;

      return {
        username,
        name: profile?.name || app?.name,
        schoolId,
        schoolName,
        ecoPoints: taskPoints + quizPoints,
        tasksCreated,
        quizzesCreated,
      };
    }));

    const rows = (computed.filter(Boolean) as any[])
      .sort((a, b) => Number(b.ecoPoints || 0) - Number(a.ecoPoints || 0));

    const start = Math.max(0, offset || 0);
    const end = start + Math.max(1, Math.min(500, limit || 50));
    const paged = rows.slice(start, end);
    console.log(`${debugPrefix} results=${paged.length}`);
    return paged;
  }

  async getSchoolPreview(schoolId: string) {
    const s = await MongoSchool.findOne({ id: schoolId }).select({ id: 1, name: 1 }).lean();
    if (!s) return null;
    const rows = await this.getSchoolStudentsLeaderboard(schoolId, 1000, 0);
    const top = rows[0];
    const eco = rows.reduce((acc, r) => acc + Number(r.ecoPoints || 0), 0);
    const students = rows.length;
    return { schoolId, schoolName: s.name, ecoPoints: eco, students, topStudent: top ? { username: top.username, name: top.name, ecoPoints: top.ecoPoints } : undefined };
  }

  async getTeacherPreview(targetUsername: string) {
    const user = await this.mongoStorage.getUserByUsername(targetUsername);
    if (!user) return null;
    const profile = await this.mongoStorage.getOwnProfile(targetUsername);
    if (!profile || profile.role !== 'teacher') return null;
    const tid = user.id;
    const schoolName = this.getSchoolNameFromProfileSchoolId(profile.schoolId);

    // compute same as teachers leaderboard for single teacher
    const teacherTasks = await mongoStorage.listTeacherTasks(user.username);
    const ownedTaskIds = new Set(teacherTasks.map(t => t.id));
    const tasksCreated = ownedTaskIds.size;

    let eco = 0;
    const submissions = await mongoStorage.listSubmissionsForTeacher(user.username);
    submissions.forEach(s => { if (s.status === 'approved') eco += Number(s.points || 0); });

    const teacherQuizStats = await this.getTeacherQuizStats(tid);
    const quizzesCreated = teacherQuizStats.quizzesCreated;
    eco += teacherQuizStats.ecoPoints;

    return { username: user.username, name: profile.name, schoolId: profile.schoolId, schoolName, ecoPoints: eco, tasksCreated, quizzesCreated };
  }

  async getAdminLeaderboardAnalytics() {
    // Define current week window (Mon..Sun)
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = ((day + 6) % 7);
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - diffToMonday);
    const startMs = monday.getTime();
    const activeSchoolIds = new Set<string>();
    let totalEcoPointsThisWeek = 0;
    // Activity during this week
    const allSubmissions = await MongoSubmission.find({ status: 'approved' }).lean();
    allSubmissions.forEach((s: any) => {
      if ((s.reviewedAt || s.submittedAt) >= startMs) {
        const sid = (this.profiles.get(s.studentUserId) || {}).schoolId;
        if (sid) activeSchoolIds.add(sid);
        totalEcoPointsThisWeek += Number(s.points || 0);
      }
    });
    const quizAttempts = await MongoQuizAttempt.find({}).select({ userId: 1, quizId: 1, submittedAt: 1 }).lean();
    const quizIds = Array.from(new Set(quizAttempts.map((a: any) => String(a.quizId || '')).filter(Boolean)));
    const quizzes = quizIds.length ? await MongoQuiz.find({ id: { $in: quizIds } }).select({ id: 1, points: 1 }).lean() : [];
    const quizPointsById = new Map<string, number>();
    for (const quiz of quizzes as any[]) quizPointsById.set(String(quiz.id), Number(quiz.points || 0));
    for (const attempt of quizAttempts as any[]) {
      const attemptedAt = Number(attempt.submittedAt || 0);
      if (attemptedAt < startMs) continue;
      const sid = (this.profiles.get(String(attempt.userId || '')) || {}).schoolId;
      if (sid) activeSchoolIds.add(sid);
      totalEcoPointsThisWeek += Number(quizPointsById.get(String(attempt.quizId || '')) || 0);
    }
    this.lessonCompletions.forEach(lc => {
      if (lc.completedAt >= startMs) {
        const sid = (this.profiles.get(lc.studentUserId) || {}).schoolId;
        if (sid) activeSchoolIds.add(sid);
        totalEcoPointsThisWeek += Number(lc.points || 0);
      }
    });
    // New approved students this week
    let newStudentsThisWeek = 0;
    // We don't persist user creation timestamps; infer via profile presence timing is absent.
    // Approximation: count students with at least one activity in week that had no activity earlier.
    const seenBefore = new Set<string>();
    allSubmissions.forEach((s: any) => { if ((s.reviewedAt || s.submittedAt) < startMs) seenBefore.add(s.studentUserId); });
    for (const attempt of quizAttempts as any[]) {
      const studentId = String(attempt.userId || '');
      const attemptedAt = Number(attempt.submittedAt || 0);
      if (attemptedAt < startMs) seenBefore.add(studentId);
    }
    const { LessonCompletion: MongoLessonCompletion } = await import('./models/LessonCompletion');
    const allCompletions = await MongoLessonCompletion.find({}).lean();
    allCompletions.forEach((lc: any) => { if (lc.completedAt < startMs) seenBefore.add(lc.studentUserId); });
    const activeThisWeek = new Set<string>();
    allSubmissions.forEach((s: any) => { if ((s.reviewedAt || s.submittedAt) >= startMs) activeThisWeek.add(s.studentUserId); });
    for (const attempt of quizAttempts as any[]) {
      const studentId = String(attempt.userId || '');
      const attemptedAt = Number(attempt.submittedAt || 0);
      if (attemptedAt >= startMs) activeThisWeek.add(studentId);
    }
    allCompletions.forEach((lc: any) => { if (lc.completedAt >= startMs) activeThisWeek.add(lc.studentUserId); });
    activeThisWeek.forEach(id => { if (!seenBefore.has(id)) newStudentsThisWeek++; });
    // Inactive schools = schools with zero activity in week
    const inactiveSchools: Array<{ schoolId: string; schoolName: string }> = [];
    this.schools.forEach(s => { if (!activeSchoolIds.has(s.id)) inactiveSchools.push({ schoolId: s.id, schoolName: s.name }); });
    return { activeSchoolsThisWeek: activeSchoolIds.size, newStudentsThisWeek, totalEcoPointsThisWeek, inactiveSchools };
  }

  private async computeWeeklyStreak(uid: string): Promise<WeeklyStreak> {
    // Build set of dates (YYYY-MM-DD) with activity within last 7 days (Mon..Sun of current week)
    const now = new Date();
    const day = now.getDay(); // 0 Sun .. 6 Sat
    // find Monday of current week
    const diffToMonday = ((day + 6) % 7); // 0 if Monday
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - diffToMonday);
    const days: boolean[] = new Array(7).fill(false);
    const mark = (ts: number) => {
      const d = new Date(ts);
      if (d < monday) return;
      const idx = Math.min(6, Math.floor((d.getTime() - monday.getTime()) / (24 * 3600 * 1000)));
      if (idx >= 0 && idx < 7) days[idx] = true;
    };
    const streakSubmissions = await MongoSubmission.find({ studentUserId: uid }).lean();
    streakSubmissions.forEach((s: any) => { mark(s.submittedAt); });
    const quizAttempts = await MongoQuizAttempt.find({ userId: uid }).select({ submittedAt: 1 }).lean();
    for (const attempt of quizAttempts as any[]) {
      mark(Number(attempt.submittedAt || 0));
    }
    const gamePlaysStreak = await mongoStorage.getAllGamePlaysForUser(uid);
    for (const g of gamePlaysStreak) mark(g.playedAt);
    const lessonCompletionsStreak = await mongoStorage.listLessonCompletions(uid);
    for (const lc of lessonCompletionsStreak) mark(lc.completedAt);
    return { days, start: monday.getTime() };
  }

  private computeProfileCompletion(p: any): number {
    const fields = ['name', 'email', 'schoolId', 'photoDataUrl', 'className', 'section', 'studentId'];
    const have = fields.reduce((acc, f) => acc + (p && p[f] ? 1 : 0), 0);
    return Math.round((have / fields.length) * 100);
  }

  private async countUnread(uid: string): Promise<number> {
    const notifications = await mongoStorage.listNotifications(uid);
    return notifications.filter(n => !n.readAt).length;
  }

  async setStudentPrivacy(username: string, allowExternalView: boolean) {
    const id = this.findUserIdByUsername(username);
    if (!id) return { ok: false as const, error: 'User not found' };
    if (this.roles.get(id) !== 'student') return { ok: false as const, error: 'Not a student' };
    const p = this.profiles.get(id) || {};
    this.profiles.set(id, { ...p, allowExternalView: !!allowExternalView });
    this.save();
    return { ok: true as const };
  }

  async listLessonCompletions(studentUsername: string): Promise<LessonCompletion[]> {
    const mongoUser = await mongoStorage.getUserByUsername(studentUsername);
    if (!mongoUser) return [];
    const mongoProfile = await mongoStorage.getOwnProfile(studentUsername);
    if (mongoProfile?.role !== 'student') return [];
    return await mongoStorage.listLessonCompletions(mongoUser.id) as LessonCompletion[];
  }

  async completeLesson(studentUsername: string, input: { moduleId: string; moduleTitle: string; lessonId: string; lessonTitle: string; points: number }) {
    const mongoUser = await mongoStorage.getUserByUsername(studentUsername);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    const mongoProfile = await mongoStorage.getOwnProfile(studentUsername);
    if (mongoProfile?.role !== 'student') return { ok: false as const, error: 'Not a student' };
    const moduleId = String(input.moduleId || '').trim();
    const lessonId = String(input.lessonId || '').trim();
    const moduleTitle = String(input.moduleTitle || '').trim();
    const lessonTitle = String(input.lessonTitle || '').trim();
    const points = Number(input.points || 0);
    if (!moduleId || !lessonId || !moduleTitle || !lessonTitle) return { ok: false as const, error: 'Missing lesson details' };
    if (!Number.isFinite(points) || points <= 0) return { ok: false as const, error: 'Invalid points' };

    const alreadyCompleted = await mongoStorage.hasCompletedLesson(mongoUser.id, moduleId, lessonId);
    if (alreadyCompleted) {
      const existing = (await mongoStorage.getLessonCompletionsByModule(mongoUser.id, moduleId)).find(l => l.lessonId === lessonId);
      return { ok: true as const, completion: existing as LessonCompletion, alreadyCompleted: true as const };
    }

    const completion = await mongoStorage.completeLesson({
      studentUserId: mongoUser.id,
      moduleId,
      moduleTitle,
      lessonId,
      lessonTitle,
      points: Math.floor(points),
      completedAt: Date.now(),
    });
    return { ok: true as const, completion: completion as LessonCompletion, alreadyCompleted: false as const };
  }

  async listLearningModules(): Promise<LearningModule[]> {
    return (await mongoStorage.listLearningModules()) as unknown as LearningModule[];
  }

  async listManagedLearningModules(managerUsername: string): Promise<LearningModule[]> {
    const mongoUser = await mongoStorage.getUserByUsername(managerUsername);
    if (!mongoUser) return [];
    const mongoProfile = await mongoStorage.getOwnProfile(managerUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return [];
    return await this.listLearningModules();
  }

  async upsertManagedLearningModule(managerUsername: string, input: { id?: string; title: string; description?: string; lessons: Array<{ id?: string; title: string; duration?: string; points: number; content?: string }> }) {
    const mongoUser = await mongoStorage.getUserByUsername(managerUsername);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    const uid = mongoUser.id;
    const mongoProfile = await mongoStorage.getOwnProfile(managerUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return { ok: false as const, error: 'Not allowed' };

    const title = String(input?.title || '').trim();
    if (!title) return { ok: false as const, error: 'Module title is required' };

    const nextId = (String(input?.id || '').trim() || title.toLowerCase())
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!nextId) return { ok: false as const, error: 'Invalid module id' };

    const rawLessons = Array.isArray(input?.lessons) ? input.lessons : [];
    if (rawLessons.length === 0) return { ok: false as const, error: 'At least one lesson is required' };

    const lessons: LearningLesson[] = [];
    const seenLessonIds = new Set<string>();
    for (let i = 0; i < rawLessons.length; i++) {
      const raw = rawLessons[i] || ({} as any);
      const lessonTitle = String(raw.title || '').trim();
      if (!lessonTitle) return { ok: false as const, error: `Lesson ${i + 1} title is required` };
      const lessonId = (String(raw.id || '').trim() || lessonTitle.toLowerCase())
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!lessonId) return { ok: false as const, error: `Lesson ${i + 1} id is invalid` };
      if (seenLessonIds.has(lessonId)) return { ok: false as const, error: `Duplicate lesson id: ${lessonId}` };
      seenLessonIds.add(lessonId);

      let points = Math.floor(Number(raw.points));
      if (!Number.isFinite(points) || points < 1) points = 1;
      if (points > 500) points = 500;

      lessons.push({
        id: lessonId,
        title: lessonTitle,
        duration: String(raw.duration || '').trim() || '10 minutes',
        points,
        content: String(raw.content || '').trim() || `<h2>${lessonTitle}</h2><p>Lesson content coming soon.</p>`,
      });
    }

    const existing = await mongoStorage.getLearningModuleById(nextId);
    let module;
    if (existing) {
      module = await mongoStorage.updateLearningModule(nextId, { title, description: String(input?.description || '').trim(), lessons, visibility: existing.visibility || 'school' });
    } else {
      module = await mongoStorage.createLearningModule({ id: nextId, title, description: String(input?.description || '').trim(), lessons, createdByUserId: uid, visibility: 'school' });
    }

    return { ok: true as const, module: module as LearningModule };
  }

  async deleteManagedLearningModule(managerUsername: string, moduleId: string) {
    const mongoUser = await mongoStorage.getUserByUsername(managerUsername);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    const mongoProfile = await mongoStorage.getOwnProfile(managerUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return { ok: false as const, error: 'Not allowed' };

    const id = String(moduleId || '').trim();
    if (!id) return { ok: false as const, error: 'Module id is required' };
    
    await mongoStorage.deleteLearningModule(id);
    return { ok: true as const };
  }

  // Admin accounts — MongoDB only
  async listAdmins() {
    console.log("AUTH: using MongoDB");
    const profiles = await MongoProfile.find({ role: 'admin' }).select({ id: 1, name: 1, email: 1 }).lean();
    const userIds = profiles.map((p: any) => String(p.id));
    const { User: MongoUserModel } = await import('./models/User');
    const users = await MongoUserModel.find({ id: { $in: userIds } }).select({ id: 1, username: 1 }).lean();
    const usernameById = new Map(users.map((u: any) => [String(u.id), String(u.username)]));
    return profiles.map((p: any) => ({
      username: usernameById.get(String(p.id)) || '',
      name: String(p.name || ''),
      email: String(p.email || ''),
    })).filter(a => a.username);
  }

  async createAdmin(input: { username: string; password: string; name?: string; email?: string }) {
    console.log("AUTH: using MongoDB");
    const uname = input.username?.trim();
    if (!uname || !input.password) return { ok: false as const, error: 'Missing fields' };
    const available = await this.isUsernameAvailable(uname);
    if (!available) return { ok: false as const, error: 'Username taken' };
    const id = randomUUID();
    const hashedPassword = this.toHashedPassword(input.password);
    const { User: MongoUserModel } = await import('./models/User');
    await MongoUserModel.create({ id, username: uname, password: hashedPassword });
    await MongoProfile.updateOne(
      { id },
      { $set: { id, role: 'admin', name: input.name || '', email: input.email || '' } },
      { upsert: true }
    );
    // Keep in-memory in sync
    this.users.set(id, { id, username: uname, password: hashedPassword });
    this.roles.set(id, 'admin');
    this.profiles.set(id, { name: input.name || '', email: input.email || '', role: 'admin' });
    this.save();
    console.log(`AUTH: admin ${uname} created in MongoDB`);
    return { ok: true as const };
  }

  async updateAdmin(username: string, updates: { username?: string; name?: string; email?: string }, currentUsername?: string) {
    console.log("AUTH: using MongoDB");
    if (username === 'admin123' && currentUsername !== 'admin123') return { ok: false as const, error: 'Only main admin can edit main admin' };
    const { User: MongoUserModel } = await import('./models/User');
    const mongoUser = await MongoUserModel.findOne({ username }).lean();
    if (!mongoUser) return { ok: false as const, error: 'Not found' };
    const userId = String((mongoUser as any).id);
    const profile = await MongoProfile.findOne({ id: userId }).lean();
    if ((profile as any)?.role !== 'admin') return { ok: false as const, error: 'Not an admin' };
    // Handle username change
    if (updates.username && updates.username.trim() !== username) {
      if (username === 'admin123') return { ok: false as const, error: 'Main admin username cannot change' };
      const newU = updates.username.trim();
      const available = await this.isUsernameAvailable(newU);
      if (!available) return { ok: false as const, error: 'Username taken' };
      await MongoUserModel.updateOne({ username }, { $set: { username: newU } });
    }
    // Update profile
    await MongoProfile.updateOne(
      { id: userId },
      { $set: { name: updates.name ?? (profile as any)?.name, email: updates.email ?? (profile as any)?.email, role: 'admin' } }
    );
    return { ok: true as const };
  }

  async deleteAdmin(username: string) {
    console.log("AUTH: using MongoDB");
    if (username === 'admin123') return { ok: false as const, error: 'Cannot delete main admin' };
    const { User: MongoUserModel } = await import('./models/User');
    const mongoUser = await MongoUserModel.findOne({ username }).lean();
    if (!mongoUser) return { ok: false as const, error: 'Not found' };
    const userId = String((mongoUser as any).id);
    const profile = await MongoProfile.findOne({ id: userId }).lean();
    if ((profile as any)?.role !== 'admin') return { ok: false as const, error: 'Not an admin' };
    await MongoUserModel.deleteOne({ username });
    await MongoProfile.deleteOne({ id: userId });
    // Keep in-memory in sync
    this.users.delete(userId);
    this.roles.delete(userId);
    this.profiles.delete(userId);
    this.save();
    return { ok: true as const };
  }


  private async getSchoolIdForUserId(userId: string): Promise<string | undefined> {
    // Get profile from MongoDB
    const profile = await mongoStorage.getProfileById(userId);
    return profile?.schoolId;
  }

  async createTask(teacherUsername: string, input: { title: string; description?: string; deadline?: string; proofType?: 'photo'; maxPoints: number; groupMode?: 'solo' | 'group'; maxGroupSize?: number }) {
    console.log("Using MongoDB for task creation");
    const user = await this.mongoStorage.getUserByUsername(teacherUsername);
    if (!user) return { ok: false as const, error: 'Teacher not found' };
    const tid = user.id;
    const schoolId = await this.getSchoolIdForUserId(tid);
    console.log(`Task creation for teacher ${teacherUsername}, schoolId: ${schoolId}`);

    // Delegate to MongoDB
    return await mongoStorage.createTask(teacherUsername, {
      ...input,
      id: randomUUID(),
      schoolId: schoolId || '',
    });
  }

  async listTeacherTasks(teacherUsername: string) {
    return await mongoStorage.listTeacherTasks(teacherUsername);
  }

  async listStudentTasks(studentUsername: string) {
    console.log("Using MongoDB for student tasks");
    return await mongoStorage.listStudentTasks(studentUsername);
  }

  async submitTask(studentUsername: string, taskId: string, photoDataUrlOrList: string | string[]) {
    return await mongoStorage.submitTask(studentUsername, taskId, photoDataUrlOrList);
  }

  async listSubmissionsForTeacher(teacherUsername: string, taskId?: string) {
    return await mongoStorage.listSubmissionsForTeacher(teacherUsername, taskId);
  }

  async reviewSubmission(teacherUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }) {
    return await mongoStorage.reviewSubmission(teacherUsername, submissionId, decision);
  }

  // ===== Groups =====

  async createTaskGroup(studentUsername: string, taskId: string, members: string[]) {
    // Resolve student user ID via MongoDB
    const studentUser = await mongoStorage.getUserByUsername(studentUsername);
    if (!studentUser) return { ok: false as const, error: 'Student not found' };

    const studentProfile = await mongoStorage.getOwnProfile(studentUsername);
    if (!studentProfile || studentProfile.role !== 'student') return { ok: false as const, error: 'Not a student' };

    const task = await mongoStorage.getTaskById(taskId);
    if (!task) return { ok: false as const, error: 'Task not found' };
    if ((task as any).groupMode !== 'group') return { ok: false as const, error: 'This task does not accept groups' };

    const schoolId = studentProfile.schoolId;
    if (!schoolId || schoolId !== (task as any).schoolId) return { ok: false as const, error: 'Task not available for this student' };

    // Normalize and ensure self included
    const usernames = Array.from(new Set((members || []).map(u => String(u).trim()).filter(Boolean)));
    if (!usernames.includes(studentUsername)) usernames.push(studentUsername);

    // Map to user IDs and validate
    const memberIds: string[] = [];
    for (const uname of usernames) {
      const user = await mongoStorage.getUserByUsername(uname);
      if (!user) return { ok: false as const, error: `User @${uname} not found` };

      const profile = await mongoStorage.getOwnProfile(uname);
      if (!profile || profile.role !== 'student') return { ok: false as const, error: `@${uname} is not a student` };

      const uSchool = profile.schoolId;
      if (!uSchool || uSchool !== schoolId) return { ok: false as const, error: `@${uname} not in your school` };

      // Already in a group for this task?
      const { TaskGroup: TaskGroupModel } = await import('./models/TaskGroup');
      const existingGroup = await TaskGroupModel.findOne({ taskId, memberUserIds: user.id }).lean();
      if (existingGroup) return { ok: false as const, error: `@${uname} already in another group` };

      memberIds.push(user.id);
    }

    if (!(task as any).maxGroupSize) return { ok: false as const, error: 'Task missing group size' };
    if (memberIds.length < 2) return { ok: false as const, error: 'At least 2 members required' };
    if (memberIds.length > (task as any).maxGroupSize) return { ok: false as const, error: `Max ${(task as any).maxGroupSize} members` };

    // Create group in MongoDB
    const { TaskGroup: TaskGroupModel } = await import('./models/TaskGroup');
    const group = await TaskGroupModel.create({
      id: randomUUID(),
      taskId,
      memberUserIds: memberIds,
      createdAt: Date.now()
    });

    // Resolve usernames for response
    const memberUsernames: string[] = [];
    for (const uid of memberIds) {
      const u = await mongoStorage.getUser(uid);
      if (u) memberUsernames.push(u.username);
    }

    return { ok: true as const, group: { ...group.toObject(), memberUsernames } };
  }

  async getTaskGroupForStudent(studentUsername: string, taskId: string) {
    const studentUser = await mongoStorage.getUserByUsername(studentUsername);
    if (!studentUser) return null;

    const { TaskGroup: TaskGroupModel } = await import('./models/TaskGroup');
    const group = await TaskGroupModel.findOne({ taskId, memberUserIds: studentUser.id }).lean();
    if (!group) return null;

    // Resolve usernames for response
    const memberUsernames: string[] = [];
    for (const uid of (group as any).memberUserIds) {
      const u = await mongoStorage.getUser(uid);
      if (u) memberUsernames.push(u.username);
    }

    return {
      id: String(group.id),
      taskId: String((group as any).taskId ?? ((group as any).taskIds?.[0] ?? '')),
      memberUserIds: Array.isArray((group as any).memberUserIds) ? (group as any).memberUserIds : [],
      createdAt: Number((group as any).createdAt || Date.now()),
      memberUsernames,
    };
  }

  // ===== Announcements =====
  async createAnnouncement(teacherUsername: string, input: { title: string; body?: string }) {
    const user = await this.mongoStorage.getUserByUsername(teacherUsername);
    if (!user) return { ok: false as const, error: 'Teacher not found' };
    const profile = await this.mongoStorage.getOwnProfile(teacherUsername);
    const schoolId = profile?.schoolId || '';

    return await mongoStorage.createAnnouncement(teacherUsername, {
      ...input,
      id: randomUUID(),
      schoolId,
    });
  }

  async listAnnouncementsForTeacher(teacherUsername: string) {
    return await mongoStorage.listAnnouncementsForTeacher(teacherUsername);
  }

  async createAdminAnnouncement(adminUsername: string, input: { title: string; body?: string }) {
    return await mongoStorage.createAdminAnnouncement(adminUsername, {
      ...input,
      id: randomUUID(),
      schoolId: 'global',
    });
  }

  async listAdminAnnouncements(adminUsername: string) {
    return await mongoStorage.listAdminAnnouncements(adminUsername);
  }

  async updateAdminAnnouncement(adminUsername: string, announcementId: string, updates: { title?: string; body?: string }) {
    return await mongoStorage.updateAdminAnnouncement(adminUsername, announcementId, updates);
  }

  async deleteAdminAnnouncement(adminUsername: string, announcementId: string) {
    return await mongoStorage.deleteAdminAnnouncement(adminUsername, announcementId);
  }

  async listStudentAnnouncements(studentUsername: string) {
    return await mongoStorage.listStudentAnnouncements(studentUsername);
  }

  // ===== Assignments (simple, create/list) =====
  async createAssignment(teacherUsername: string, input: { title: string; description?: string; deadline?: string; maxPoints?: number }) {
    console.log('STORAGE HIT: createAssignment');
    const user = await this.mongoStorage.getUserByUsername(teacherUsername);
    if (!user) return { ok: false as const, error: 'Teacher not found' };
    const userId = user.id;
    const schoolId = await this.getSchoolIdForUserId(userId);
    const data = {
      ...input,
      id: randomUUID(),
      createdByUserId: userId,
      schoolId: schoolId || 'global',
      createdAt: Date.now(),
      visibility: 'school' as const,
    };
    return await mongoStorage.createAssignment(data);
  }
  async listTeacherAssignments(teacherUsername: string) {
    console.log('STORAGE HIT: listTeacherAssignments', teacherUsername);
    return await mongoStorage.listAssignmentsByTeacher(teacherUsername);
  }
  async createAdminAssignment(adminUsername: string, input: { title: string; description?: string; deadline?: string; maxPoints?: number }) {
    const user = await this.mongoStorage.getUserByUsername(adminUsername);
    if (!user) return { ok: false as const, error: 'Admin not found' };
    const userId = user.id;
    const data = {
      ...input,
      id: randomUUID(),
      createdByUserId: userId,
      schoolId: 'global',
      createdAt: Date.now(),
      visibility: 'global' as const,
    };
    return await mongoStorage.createAssignment(data);
  }
  async listAdminAssignments(adminUsername: string) {
    const mongoAssignments = await MongoAssignment.find({ visibility: 'global' }).sort({ createdAt: -1 }).lean();
    return mongoAssignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      deadline: a.deadline ? a.deadline.toString() : undefined,
      maxPoints: a.maxPoints,
      createdByUserId: a.createdByUserId,
      schoolId: a.schoolId,
      createdAt: typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime(),
      visibility: a.visibility
    })) as Assignment[];
  }
  async updateAdminAssignment(adminUsername: string, assignmentId: string, updates: any) {
    const mongoAssignment = await MongoAssignment.findOneAndUpdate({ id: assignmentId }, { $set: updates }, { new: true }).lean();
    if (!mongoAssignment) return { ok: false as const, error: 'Assignment not found' };
    const assignment: Assignment = {
      id: mongoAssignment.id,
      title: mongoAssignment.title,
      description: mongoAssignment.description,
      deadline: mongoAssignment.deadline ? mongoAssignment.deadline.toString() : undefined,
      maxPoints: mongoAssignment.maxPoints,
      createdByUserId: mongoAssignment.createdByUserId,
      schoolId: mongoAssignment.schoolId,
      createdAt: typeof mongoAssignment.createdAt === 'number' ? mongoAssignment.createdAt : new Date(mongoAssignment.createdAt).getTime(),
      visibility: mongoAssignment.visibility
    };
    return { ok: true as const, assignment };
  }
  async deleteAdminAssignment(adminUsername: string, assignmentId: string) {
    const res = await MongoAssignment.deleteOne({ id: assignmentId });
    if (res.deletedCount === 0) return { ok: false as const, error: 'Assignment not found' };
    return { ok: true as const };
  }
  async listStudentAssignments(studentUsername: string) {
    return await mongoStorage.listAssignmentsForStudent(studentUsername);
  }
  async submitAssignment(studentUsername: string, assignmentId: string, filesOrList: string | string[]) {
    const files = Array.isArray(filesOrList)
      ? filesOrList.filter((f) => typeof f === 'string' && f.trim())
      : [String(filesOrList || '')].filter((f) => !!f.trim());
    return await mongoStorage.submitAssignment(studentUsername, assignmentId, files);
  }
  async listAssignmentSubmissionsForTeacher(teacherUsername: string, assignmentId?: string, page: number = 1, limit: number = 20) {
    return await mongoStorage.listAssignmentSubmissionsForTeacherPaginated(teacherUsername, assignmentId, page, limit);
  }
  async reviewAssignmentSubmission(teacherUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }) {
    return await mongoStorage.reviewAssignmentSubmission(submissionId, decision);
  }
  async listAssignmentSubmissionsForAdmin(adminUsername: string, assignmentId?: string, page: number = 1, limit: number = 20) {
    return await mongoStorage.listAssignmentSubmissionsPaginated(assignmentId, page, limit);
  }
  async reviewAdminAssignmentSubmission(adminUsername: string, submissionId: string, decision: { status: 'approved' | 'rejected'; points?: number; feedback?: string }) {
    return await mongoStorage.reviewAssignmentSubmission(submissionId, decision);
  }

  // ===== Quizzes (simple MCQ, create/list) =====
  async createQuiz(teacherUsername: string, input: { title: string; description?: string; points?: number; questions: Array<{ text: string; options: string[]; answerIndex: number }> }) {
    console.log('STORAGE HIT: createQuiz', teacherUsername);
    const user = await this.mongoStorage.getUserByUsername(teacherUsername);
    if (!user) {
      console.warn(`[createQuiz] user ${teacherUsername} not found`);
      return { ok: false as const, error: 'Teacher not found' };
    }
    const profile = await this.mongoStorage.getOwnProfile(teacherUsername);
    if (!profile) {
      console.warn(`[createQuiz] profile for ${teacherUsername} not found`);
      return { ok: false as const, error: 'Profile not found' };
    }
    if (profile.role !== 'teacher') {
      console.warn(`[createQuiz] user ${teacherUsername} has role=${profile.role}, not 'teacher'`);
      return { ok: false as const, error: 'Not a teacher' };
    }

    const result = await mongoStorage.createQuiz(teacherUsername, {
      title: input.title,
      description: input.description,
      points: input.points,
      questions: input.questions,
      visibility: 'school',
    });
    if (!result.ok) return { ok: false as const, error: (result as any).error };

    if (result.quiz.schoolId) {
      this.notifySchool(result.quiz.schoolId, `School quiz created: ${result.quiz.title}`, 'quiz');
    }
    return { ok: true as const, quiz: result.quiz };
  }
  async listTeacherQuizzes(teacherUsername: string) {
    console.log('Using MongoDB for quizzes');
    return await mongoStorage.listQuizzesByTeacher(teacherUsername);
  }

  async updateQuiz(teacherUsername: string, id: string, updates: { title?: string; description?: string; points?: number; questions?: Array<{ id?: string; text: string; options: string[]; answerIndex: number }> }) {
    console.log('Using MongoDB for quizzes');
    return await mongoStorage.updateQuiz(teacherUsername, id, updates);
  }

  async deleteQuiz(teacherUsername: string, id: string) {
    console.log('Using MongoDB for quizzes');
    return await mongoStorage.deleteQuiz(teacherUsername, id);
  }

  // ===== Admin: Global Quizzes =====
  async createAdminQuiz(adminUsername: string, input: { title: string; description?: string; points?: number; questions: Array<{ text: string; options: string[]; answerIndex: number }> }) {
    console.log(`[createAdminQuiz] Creating quiz '${input.title}' for admin: ${adminUsername}`);
    const result = await mongoStorage.createQuiz(adminUsername, {
      title: input.title,
      description: input.description,
      points: input.points,
      questions: input.questions,
      visibility: 'global',
      schoolId: '',
    });
    console.log(`[createAdminQuiz] Result: ok=${result.ok}, quiz_id=${(result as any).quiz?.id || 'N/A'}, error=${(result as any).error || 'N/A'}`);
    if (!result.ok) return { ok: false as const, error: (result as any).error };
    // Notify all students
    const students = await mongoStorage.getAllStudents();
    for (const student of students) {
      await this.addNotificationForUserId(student.id, `Global quiz created: ${result.quiz.title}`, 'quiz');
    }
    return { ok: true as const, quiz: result.quiz };
  }
  async listAdminQuizzes(adminUsername: string) {
    console.log(`[listAdminQuizzes] Listing quizzes for admin: ${adminUsername}`);
    // Pass in-memory maps for fallback during migration
    const quizzes = await mongoStorage.listQuizzesByTeacher(adminUsername);
    console.log(`[listAdminQuizzes] Retrieved ${quizzes.length} total quizzes for admin`);
    const globalQuizzes = quizzes.filter((q) => q.visibility === 'global').sort((a, b) => b.createdAt - a.createdAt);
    console.log(`[listAdminQuizzes] Filtered to ${globalQuizzes.length} global quizzes`);
    if (globalQuizzes.length > 0) {
      console.log(`[listAdminQuizzes] Global quizzes: ${globalQuizzes.map(q => `${q.id}(${q.title})`).join(', ')}`);
    }
    return globalQuizzes;
  }

  async updateAdminQuiz(adminUsername: string, id: string, updates: { title?: string; description?: string; points?: number; questions?: Array<{ id?: string; text: string; options: string[]; answerIndex: number }> }) {
    console.log('Using MongoDB for quizzes');
    const existing = await mongoStorage.getQuizById(id);
    if (!existing) return { ok: false as const, error: 'Quiz not found' };
    if (existing.visibility !== 'global') return { ok: false as const, error: 'Not allowed' };
    return await mongoStorage.updateQuiz(adminUsername, id, updates);
  }

  async deleteAdminQuiz(adminUsername: string, id: string) {
    console.log('Using MongoDB for quizzes');
    const existing = await mongoStorage.getQuizById(id);
    if (!existing) return { ok: false as const, error: 'Quiz not found' };
    if (existing.visibility !== 'global') return { ok: false as const, error: 'Not allowed' };
    return await mongoStorage.deleteQuiz(adminUsername, id);
  }

  // ===== Student: Discover Quizzes (global + school) =====
  async listStudentQuizzes(studentUsername: string) {
    console.log('Using MongoDB for quizzes');
    // Pass in-memory maps for fallback during migration
    const quizzes = await mongoStorage.listQuizzesForStudent(studentUsername);
    const attemptsByQuiz = new Map<string, QuizAttempt>();
    for (const q of quizzes) {
      const attempt = await mongoStorage.getStudentQuizAttempt(studentUsername, q.id);
      if (attempt) attemptsByQuiz.set(q.id, attempt);
    }
    return quizzes.map(q => ({ ...q, _attempt: attemptsByQuiz.get(q.id) ? { scorePercent: attemptsByQuiz.get(q.id)!.scorePercent, attemptedAt: attemptsByQuiz.get(q.id)!.attemptedAt } : undefined } as any));
  }

  async getQuizById(id: string): Promise<Quiz | undefined> {
    console.log('Using MongoDB for quizzes');
    const quiz = await mongoStorage.getQuizById(id);
    return quiz || undefined;
  }

  // ===== Students & Overview =====
  async listStudentsForTeacher(teacherUsername: string) {
    const user = await mongoStorage.getUserByUsername(teacherUsername);
    if (!user) return [];
    const profile = await mongoStorage.getProfileById(user.id);
    if (profile?.role !== 'teacher') return [];

    const schoolId = profile.schoolId;
    if (!schoolId) {
      console.warn(`listStudentsForTeacher: SchoolId not found for teacher ${teacherUsername}`);
      return [];
    }

    return await mongoStorage.listStudentsBySchool(schoolId);
  }

  async getTeacherOverview(teacherUsername: string) {
    console.time('[TeacherOverview] Total');
    
    const user = await mongoStorage.getUserByUsername(teacherUsername);
    if (!user) {
      console.warn(`[TeacherOverview] user ${teacherUsername} not found`);
      return { tasks: 0, assignments: 0, quizzes: 0, announcements: 0, videos: 0, students: 0, pendingSubmissions: 0 };
    }
    
    const profile = await mongoStorage.getProfileById(user.id);
    if (!profile) {
      console.warn(`[TeacherOverview] profile for user.id=${user.id} (username=${teacherUsername}) not found`);
      return { tasks: 0, assignments: 0, quizzes: 0, announcements: 0, videos: 0, students: 0, pendingSubmissions: 0 };
    }
    
    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      console.warn(`[TeacherOverview] user.id=${user.id} (username=${teacherUsername}) has role=${profile.role}, not 'teacher' or 'admin'`);
      return { tasks: 0, assignments: 0, quizzes: 0, announcements: 0, videos: 0, students: 0, pendingSubmissions: 0 };
    }

    // Parallel execution: count all data simultaneously (NO data fetching, only counts)
    console.time('[TeacherOverview] Parallel Counts');
    const [tasks, assignments, quizzes, announcements, videos, students, pendingSubmissions] = 
      await Promise.all([
        mongoStorage.countTeacherTasks(teacherUsername),
        mongoStorage.countAssignmentsByTeacher(teacherUsername),
        mongoStorage.countQuizzesByTeacher(teacherUsername),
        mongoStorage.countAnnouncementsForTeacher(teacherUsername),
        mongoStorage.countVideosByUploader(teacherUsername),
        mongoStorage.countStudentsForTeacher(teacherUsername),
        mongoStorage.countPendingSubmissionsForTeacher(teacherUsername)
      ]);
    console.timeEnd('[TeacherOverview] Parallel Counts');

    console.log(`[TeacherOverview] username=${teacherUsername}, userId=${user.id}, tasks=${tasks}, assignments=${assignments}, quizzes=${quizzes}, announcements=${announcements}, videos=${videos}, students=${students}, pendingSubmissions=${pendingSubmissions}`);
    console.timeEnd('[TeacherOverview] Total');

    return {
      tasks,
      assignments,
      quizzes,
      announcements,
      videos,
      students,
      pendingSubmissions
    };
  }

  // ===== Activity logging & notifications =====
  async addQuizAttempt(studentUsername: string, input: { quizId: string; answers?: number[]; scorePercent?: number }) {
    console.log('Using MongoDB for quizzes');
    return await mongoStorage.submitQuiz(studentUsername, input);
  }

  async getStudentQuizAttempt(username: string, quizId: string) {
    console.log('Using MongoDB for quizzes');
    return await mongoStorage.getStudentQuizAttempt(username, quizId);
  }

  async addGamePlay(studentUsername: string, gameId: string, points?: number) {
    const user = await mongoStorage.getUserByUsername(studentUsername);
    if (!user) return { ok: false as const, error: 'Student not found' };
    const sid = user.id;
    // anti-spam: throttle same game per user for 10s (kept in-memory)
    const key = `${sid}|${gameId}`;
    const now = Date.now();
    const last = this.lastGamePlay.get(key) || 0;
    if (now - last < 10_000) {
      return { ok: true as const, play: { id: 'throttled', gameId: String(gameId), studentUserId: sid, playedAt: now, points: 0 } } as any;
    }

    let creditPoints = 0;
    const requested = Number(points);
    if (Number.isFinite(requested) && requested > 0) {
      const alreadyCreditedToday = await mongoStorage.hasEarnedPointsForGameToday(sid, String(gameId), now);
      creditPoints = alreadyCreditedToday ? 0 : Math.max(0, Math.floor(requested));
    }

    const play = await mongoStorage.createGamePlay({
      studentUserId: sid,
      gameId: String(gameId),
      points: creditPoints || 0,
      playedAt: now,
    });
    this.lastGamePlay.set(key, now); // cooldown stays in-memory
    console.log('Using MongoDB for games');
    return { ok: true as const, play };
  }

  async getStudentGameSummary(username: string) {
    const user = await this.mongoStorage.getUserByUsername(username);
    if (!user) return { totalGamePoints: 0, badges: [], monthCompletedCount: 0, totalUniqueGames: 0 };
    const sid = user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let totalGamePoints = 0;
    const uniqueGames = new Set<string>();
    let monthCompletedCount = 0;
    // Read from MongoDB
    const plays = await mongoStorage.getAllGamePlaysForUser(sid);
    for (const g of plays) {
      uniqueGames.add(g.gameId);
      if (g.points) totalGamePoints += Number(g.points || 0);
      if (g.playedAt >= monthStart) monthCompletedCount++;
    }
    const badges: string[] = [];
    if (monthCompletedCount >= 1) badges.push('🎮 First Play');
    if (monthCompletedCount >= 5) badges.push('🔥 Game Streak 5');
    if (totalGamePoints >= 10) badges.push('⭐ Game Enthusiast');
    return { totalGamePoints, badges, monthCompletedCount, totalUniqueGames: uniqueGames.size };
  }

  async listNotifications(username: string) {
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (!mongoUser) return [] as NotificationItem[];
    return await mongoStorage.listNotifications(mongoUser.id) as NotificationItem[];
  }

  async markAllNotificationsRead(username: string) {
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    await mongoStorage.markAllNotificationsRead(mongoUser.id);
    return { ok: true as const };
  }

  private async notifySchool(schoolId: string, message: string, type: NotificationItem['type'] = 'info') {
    await mongoStorage.createNotificationsForSchool(schoolId, message, type, ['admin']);
  }

  private async addNotificationForUserId(userId: string, message: string, type: NotificationItem['type'] = 'info') {
    await mongoStorage.createNotification({ userId, message, type });
  }

  // ===== Games Catalog (Admin-managed, MongoDB) =====
  private gamesSeeded = false;

  async listGames(): Promise<Game[]> {
    console.log('Using MongoDB for games');
    // Seed defaults only once (not on every request)
    if (!this.gamesSeeded) {
      await this.ensureDemoGames();
      this.gamesSeeded = true;
    }
    return await mongoStorage.listGames() as Game[];
  }

  async listAdminGames(adminUsername: string): Promise<Game[]> {
    const mongoUser = await mongoStorage.getUserByUsername(adminUsername);
    if (!mongoUser) return [] as Game[];
    const mongoProfile = await mongoStorage.getOwnProfile(adminUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return [] as Game[];
    return await this.listGames();
  }

  async createAdminGame(adminUsername: string, input: { id?: string; name: string; category: string; description?: string; difficulty?: 'Easy' | 'Medium' | 'Hard'; points: number; icon?: string; externalUrl: string; image?: string }) {
    const mongoUser = await mongoStorage.getUserByUsername(adminUsername);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    const mongoProfile = await mongoStorage.getOwnProfile(adminUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return { ok: false as const, error: 'Not allowed' };
    const name = String(input?.name || '').trim();
    const category = String(input?.category || '').trim().toLowerCase();
    if (!name || !category) return { ok: false as const, error: 'Name and category required' };
    if (!['recycling', 'climate', 'habits', 'wildlife', 'fun'].includes(category)) return { ok: false as const, error: 'Invalid category' };
    const externalUrl = String(input?.externalUrl || '').trim();
    if (!externalUrl) return { ok: false as const, error: 'Game link is required' };
    const id = (input.id?.trim() || name.toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id) return { ok: false as const, error: 'Invalid id' };
    if (await mongoStorage.gameIdExists(id)) return { ok: false as const, error: 'ID already exists' };
    let points = Math.floor(Number(input.points));
    if (!Number.isFinite(points) || points < 1) points = 1;
    if (points > 50) points = 50;
    const difficulty = (input.difficulty === 'Easy' || input.difficulty === 'Medium' || input.difficulty === 'Hard') ? input.difficulty : undefined;
    const game = await mongoStorage.createGame({
      id, name, category,
      description: input.description ? String(input.description) : undefined,
      difficulty,
      points,
      icon: input.icon ? String(input.icon) : undefined,
      externalUrl,
      image: input.image ? String(input.image).trim() : undefined,
      createdAt: Date.now(),
      createdByUserId: mongoUser.id,
    });
    console.log('Using MongoDB for games');
    return { ok: true as const, game: game as Game };
  }

  async updateAdminGame(adminUsername: string, gameId: string, updates: Partial<{ name: string; category: string; description?: string; difficulty?: 'Easy' | 'Medium' | 'Hard'; points: number; icon?: string; externalUrl: string; image?: string }>) {
    const mongoUser = await mongoStorage.getUserByUsername(adminUsername);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    const mongoProfile = await mongoStorage.getOwnProfile(adminUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return { ok: false as const, error: 'Not allowed' };
    const g = await mongoStorage.getGameById(gameId);
    if (!g) return { ok: false as const, error: 'Game not found' };
    const mongoUpdates: any = {};
    if (typeof updates.name === 'string') mongoUpdates.name = updates.name.trim() || g.name;
    if (typeof updates.category === 'string') {
      const category = updates.category.trim().toLowerCase();
      if (!['recycling', 'climate', 'habits', 'wildlife', 'fun'].includes(category)) return { ok: false as const, error: 'Invalid category' };
      mongoUpdates.category = category;
    }
    if (typeof updates.description === 'string') mongoUpdates.description = updates.description;
    if (typeof updates.icon === 'string') mongoUpdates.icon = updates.icon;
    if (typeof updates.externalUrl === 'string') {
      const url = updates.externalUrl.trim();
      if (!url) return { ok: false as const, error: 'Game link is required' };
      mongoUpdates.externalUrl = url;
    }
    if (typeof updates.image === 'string') mongoUpdates.image = updates.image.trim();
    if (typeof updates.points !== 'undefined') {
      let p = Math.floor(Number(updates.points));
      if (!Number.isFinite(p) || p < 1) p = 1;
      if (p > 50) p = 50;
      mongoUpdates.points = p;
    }
    if (updates.difficulty === 'Easy' || updates.difficulty === 'Medium' || updates.difficulty === 'Hard') {
      mongoUpdates.difficulty = updates.difficulty;
    }
    const next = await mongoStorage.updateGame(gameId, mongoUpdates);
    return { ok: true as const, game: next as unknown as Game };
  }

  async deleteAdminGame(adminUsername: string, gameId: string) {
    const mongoUser = await mongoStorage.getUserByUsername(adminUsername);
    if (!mongoUser) return { ok: false as const, error: 'User not found' };
    const mongoProfile = await mongoStorage.getOwnProfile(adminUsername);
    const role = mongoProfile?.role;
    if (role !== 'admin' && role !== 'teacher') return { ok: false as const, error: 'Not allowed' };
    const deleted = await mongoStorage.deleteGame(gameId);
    if (!deleted) return { ok: false as const, error: 'Game not found' };
    return { ok: true as const };
  }

  // ===== Video Management =====
  async getAllVideos(): Promise<Video[]> {
    return await mongoStorage.listVideos() as Video[];
  }

  async getTeacherVideos(teacherId: string): Promise<Video[]> {
    return await mongoStorage.getVideosByUploader(teacherId) as Video[];
  }

  async getTeacherVideosCount(teacherUsername: string): Promise<number> {
    const vids = await mongoStorage.getVideosByUploader(teacherUsername);
    return vids.length;
  }

  async createVideo(input: { title: string; description?: string; type: 'youtube' | 'file'; url: string; thumbnail?: string; credits: number; uploadedBy: string; category?: string; duration?: number }): Promise<Video> {
    const video = await mongoStorage.createVideo({
      title: input.title,
      description: input.description,
      type: input.type,
      url: input.url,
      thumbnail: input.thumbnail,
      credits: input.credits,
      uploadedBy: input.uploadedBy,
      category: input.category,
      duration: input.duration,
    });
    return video as Video;
  }

  async updateVideo(id: string, updates: Partial<{ title: string; description: string; type: 'youtube' | 'file'; url: string; thumbnail: string; credits: number; category: string; duration: number; uploadedBy: string }>): Promise<Video> {
    const video = await mongoStorage.getVideoById(id);
    if (!video) throw new Error('Video not found');

    const updated = await mongoStorage.updateVideo(id, updates);
    return updated as Video;
  }

  async deleteVideo(id: string): Promise<void> {
    await mongoStorage.deleteVideo(id);
  }

  async getUserCredits(username: string): Promise<{ totalCredits: number; lastUpdated: number }> {
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (!mongoUser) return { totalCredits: 0, lastUpdated: Date.now() };

    return await mongoStorage.getUserCredits(mongoUser.id);
  }

  async recordVideoWatch(username: string, videoId: string): Promise<{ success: boolean; creditsAwarded: number }> {
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (!mongoUser) return { success: false, creditsAwarded: 0 };
    const userId = mongoUser.id;

    const video = await mongoStorage.getVideoById(videoId);
    if (!video) return { success: false, creditsAwarded: 0 };

    const existingProgress = await mongoStorage.getVideoProgress(userId, videoId);
    if (existingProgress && existingProgress.watched) {
      return { success: true, creditsAwarded: 0 }; // Already watched
    }

    const creditsAwarded = (!existingProgress || !existingProgress.creditsAwarded) ? video.credits : 0;
    
    await mongoStorage.markVideoWatched({
      userId,
      videoId,
      watchedAt: Date.now(),
      creditsAwarded: creditsAwarded > 0,
    });

    if (creditsAwarded > 0) {
      await mongoStorage.updateUserCredits(userId, creditsAwarded);
    }

    return { success: true, creditsAwarded };
  }

  async awardCredits(username: string, videoId: string, credits: number): Promise<{ success: boolean; newTotal: number }> {
    const mongoUser = await mongoStorage.getUserByUsername(username);
    if (!mongoUser) return { success: false, newTotal: 0 };

    const res = await mongoStorage.updateUserCredits(mongoUser.id, credits);
    return { success: true, newTotal: res.totalCredits };
  }

  async fetchYouTubeMetadata(url: string): Promise<{ title: string; description: string; thumbnail: string; duration?: number }> {
    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      throw new Error('Invalid YouTube URL');
    }

    const videoId = videoIdMatch[1];

    // For demo purposes, return mock metadata
    // In a real app, you would use the YouTube Data API
    return {
      title: `Video ${videoId}`,
      description: 'Environmental education video from YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 300, // 5 minutes default
    };
  }
}

export const storage = new MemStorage();

// Types used by the in-memory store
export type StudentApplication = {
  id?: string;
  name: string;
  email: string;
  username: string;
  schoolId: string;
  studentId: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  photoDataUrl?: string;
  password?: string;
};

export type TeacherApplication = {
  id?: string;
  name: string;
  email: string;
  username: string;
  schoolId: string;
  teacherId: string;
  subject?: string;
  photoDataUrl?: string;
  password?: string;
};

// New types for Tasks & Submissions
export type Task = {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // ISO or human
  proofType: 'photo';
  maxPoints: number;
  createdByUserId: string;
  schoolId: string;
  createdAt: number;
  groupMode: 'solo' | 'group';
  maxGroupSize?: number;
};

export type TaskSubmission = {
  id: string;
  taskId: string;
  studentUserId: string;
  photoDataUrl?: string; // legacy single
  photos?: string[]; // new multi
  submittedAt: number;
  status: 'submitted' | 'approved' | 'rejected';
  points?: number;
  feedback?: string;
  reviewedByUserId?: string;
  reviewedAt?: number;
  groupId?: string;
};

export type TaskGroup = {
  id: string;
  taskId: string;
  memberUserIds: string[];
  createdAt: number;
};

// Profile DTOs for self-service profile view/edit
export type ProfilePayload = {
  username: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  email: string;
  schoolId: string;
  photoDataUrl?: string;
  // student fields
  studentId?: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  // teacher fields
  teacherId?: string;
  subject?: string;
  allowExternalView?: boolean;
};

export type ProfileUpsert = {
  name: string;
  email: string;
  schoolId: string;
  photoDataUrl?: string;
  studentId?: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  teacherId?: string;
  subject?: string;
  allowExternalView?: boolean;
};

// Announcements
export type Announcement = {
  id: string;
  title: string;
  body?: string;
  createdAt: number;
  createdByUserId: string;
  schoolId: string;
  visibility: 'global' | 'school';
};

// Assignments (without submission flow for now)
export type Assignment = {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  maxPoints: number;
  createdByUserId: string;
  schoolId: string;
  createdAt: number;
  visibility: 'global' | 'school';
};

// Assignment Submissions (PDF/DOC/DOCX files via data URLs)
export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentUserId: string;
  files: string[]; // data:application/* URLs
  submittedAt: number;
  status: 'submitted' | 'approved' | 'rejected';
  points?: number;
  feedback?: string;
  reviewedByUserId?: string;
  reviewedAt?: number;
};

// Quizzes
export type QuizQuestion = {
  id: string;
  text: string;
  options: string[]; // up to 4
  answerIndex: number; // 0..3
};
export type Quiz = {
  id: string;
  title: string;
  description?: string;
  points: number; // 1..3 small points
  createdByUserId: string;
  schoolId: string;
  createdAt: number;
  questions: QuizQuestion[];
  visibility: 'global' | 'school';
};

// Student profile view
export type StudentProfileView = {
  username: string;
  name: string;
  schoolId: string;
  ecoPoints: number;
  ecoTreeStage: 'Seedling' | 'Small Tree' | 'Big Tree';
  achievements: Array<{ key: string; name: string; unlocked: boolean }>;
  timeline: TimelineItem[];
  ranks: { global: number | null; school: number | null };
  allowExternalView: boolean;
  week: WeeklyStreak;
  leaderboardNext: { username: string; points: number } | null;
  profileCompletion: number; // 0..100
  unreadNotifications: number;
  gamesPlayedTotal: number;
  uniqueGamesPlayed: number;
};

// Timeline
export type TimelineItem = {
  kind: 'task' | 'quiz' | 'game' | 'lesson';
  when: number;
  title: string;
  // optional enrichments
  photoDataUrl?: string; // task proof
  points?: number; // task or quiz points
  scorePercent?: number; // quiz
  lastPlayedAt?: number; // game
  moduleId?: string;
  lessonId?: string;
};

// Learning completions
export type LessonCompletion = {
  id: string;
  studentUserId: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  points: number;
  completedAt: number;
};

export type LearningLesson = {
  id: string;
  title: string;
  duration: string;
  points: number;
  content: string;
};

export type LearningModule = {
  id: string;
  title: string;
  description?: string;
  lessons: LearningLesson[];
  createdAt: number;
  updatedAt: number;
  createdByUserId: string;
  updatedByUserId: string;
  deleted?: boolean;
};

// Weekly streak (Mon..Sun)
export type WeeklyStreak = {
  start: number; // Monday start timestamp
  days: boolean[]; // length 7, index 0=Mon
};

// Quiz attempts and game plays
export type QuizAttempt = {
  id: string;
  quizId: string;
  studentUserId: string;
  answers?: number[];
  scorePercent: number; // 0..100
  attemptedAt: number;
};
export type GamePlay = {
  id: string;
  gameId: string; // simple string id/name
  studentUserId: string;
  playedAt: number;
  points?: number;
};

// Admin-managed Game catalog entry
export type Game = {
  id: string; // slug
  name: string;
  category: string;
  description?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  points: number; // credit awarded first time completed
  icon?: string; // emoji or icon name
  externalUrl?: string; // optional hosted/custom game link
  image?: string; // optional photo URL shown in catalog card
  createdAt: number;
  createdByUserId: string; // admin id
};

// Notifications
export type NotificationItem = {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'task' | 'quiz' | 'announcement' | 'badge';
  createdAt: number;
  readAt?: number;
};

// Video Management Types
export type Video = {
  id: string;
  title: string;
  description?: string;
  type: 'youtube' | 'file';
  url: string; // YouTube URL or file path
  thumbnail?: string; // Thumbnail URL or path
  credits: number; // Credits awarded for watching
  uploadedBy: string; // User ID of uploader
  uploadedAt: number;
  category?: string; // Optional categorization
  duration?: number; // Duration in seconds (for files)
};

export type UserVideoProgress = {
  id: string;
  userId: string;
  videoId: string;
  watched: boolean;
  watchedAt?: number;
  creditsAwarded: boolean;
};

export type UserCredits = {
  id: string;
  userId: string;
  totalCredits: number;
  lastUpdated: number;
};
