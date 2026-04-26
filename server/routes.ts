import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { randomBytes } from "crypto";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage, type StudentApplication, type TeacherApplication } from "./storage";
import { sendAdminNotification, sendEmail, sendWelcomeEmail, sendApplicationStatusEmail } from "./email";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureUploadsDir, getUploadsDir } from "./uploads";
import { User as MongoUser } from "./models/User";
import { Profile as MongoProfile } from "./models/Profile";
import { School as MongoSchool } from "./models/School";
import { Submission as MongoSubmission } from "./models/Submission";
import { LearningModule } from "./models/LearningModule";
import { MongoStorage } from "./mongo-storage";

const mongoStorage = new MongoStorage();

export async function registerRoutes(app: Express): Promise<Server> {
  type SessionRole = 'student' | 'teacher' | 'admin';
  type JwtSessionPayload = {
    username: string;
    role: SessionRole;
    sessionStart: number;
    lastActivityAt: number;
    iat?: number;
    exp?: number;
  };

  const AUTH_COOKIE = 'ev_token';
  const cwd = typeof process.cwd === "function" ? process.cwd() : "";
  const projectRoot = process.cwd();
  if (!cwd) {
    console.warn("process.cwd() unavailable, falling back to derived project root for static paths.");
  }
  const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const SESSION_ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
  const envJwtSecret = process.env.JWT_SECRET?.trim();
  const jwtSecret = envJwtSecret || randomBytes(32).toString('hex');

  if (!envJwtSecret) {
    console.warn('JWT_SECRET not set - using temporary secret (not safe for production)');
  }

  const parseCookies = (cookieHeader?: string) => {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    for (const item of cookieHeader.split(';')) {
      const [rawKey, ...rest] = item.trim().split('=');
      if (!rawKey) continue;
      out[rawKey] = decodeURIComponent(rest.join('=') || '');
    }
    return out;
  };

  const setAuthCookie = (res: any, token: string) => {
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_ABSOLUTE_TIMEOUT_MS,
    });
  };

  const clearAuthCookie = (res: any) => {
    res.clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  };

  const issueAuthToken = (session: JwtSessionPayload) => {
    return jwt.sign(session, jwtSecret, { expiresIn: Math.ceil(SESSION_ABSOLUTE_TIMEOUT_MS / 1000) });
  };

  const getTokenFromRequest = (req: any) => {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }
    const cookies = parseCookies(req.headers.cookie as string | undefined);
    return cookies[AUTH_COOKIE];
  };

  const getActiveSession = (req: any, res?: any) => {
    const token = getTokenFromRequest(req);
    if (!token) return null;
    let payload: JwtSessionPayload;
    try {
      payload = jwt.verify(token, jwtSecret) as JwtSessionPayload;
    } catch {
      if (res) clearAuthCookie(res);
      return null;
    }
    const now = Date.now();
    const idleExpired = now - Number(payload.lastActivityAt || 0) > SESSION_IDLE_TIMEOUT_MS;
    const absoluteExpired = now - Number(payload.sessionStart || 0) > SESSION_ABSOLUTE_TIMEOUT_MS;
    if (idleExpired || absoluteExpired) {
      if (res) clearAuthCookie(res);
      return null;
    }

    const refreshedSession: JwtSessionPayload = {
      username: payload.username,
      role: payload.role,
      sessionStart: payload.sessionStart,
      lastActivityAt: now,
    };
    if (res) setAuthCookie(res, issueAuthToken(refreshedSession));
    return refreshedSession;
  };

  const uploadsDir = getUploadsDir();
  const uploadsDirStatus = ensureUploadsDir();
  if (!uploadsDirStatus.ok) {
    console.warn('Uploads directory could not be prepared at startup. File uploads may fail until permissions are fixed.');
  }
  app.use('/uploads', express.static(uploadsDir));

  const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const result = ensureUploadsDir();
      if (!result.ok) {
        return cb(new Error('Uploads directory is unavailable'), result.uploadsDir);
      }

      cb(null, result.uploadsDir);
    },
    filename: (_req, file, cb) => {
      const safeBase = path.basename(file.originalname).replace(/[^A-Za-z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}-${safeBase}`);
    },
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 150 * 1024 * 1024 },
  });

  // Middleware to log API response times
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`${req.method} ${req.path} took ${duration}ms`);
    });
    next();
  });

  const protectedPrefixes = ['/api/me', '/api/student', '/api/teacher', '/api/admin', '/api/learning'];
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();

    const needsSession = protectedPrefixes.some(prefix => req.path.startsWith(prefix));
    if (!needsSession) return next();

    const session = getActiveSession(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    req.headers['x-username'] = session.username;
    req.headers['x-role'] = session.role;
    next();
  });

  // Serve all assets under public/models (textures, bins, nested folders) so GLB dependencies resolve
  const modelsRoot = path.join(projectRoot, 'public', 'models');
  app.use('/api/models', express.static(modelsRoot));

  // Serve any model from public/models safely
  app.get('/api/models/:file', (req, res) => {
    const { file } = req.params;
    // basic sanitization: only allow .glb or .gltf under public/models
    if (!/^[A-Za-z0-9._-]+\.(glb|gltf)$/.test(file)) {
      return res.status(400).json({ error: 'Invalid model filename' });
    }

    const filePath = path.join(projectRoot, 'public', 'models', file);
    res.type(path.extname(filePath));
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving model file:', err);
        res.status(404).json({ error: 'Model not found' });
      }
    });
  });

  // Serve any image from public folder safely
  app.get('/api/image/:file', (req, res) => {
    const { file } = req.params;
    // basic sanitization: only allow common image formats
    if (!/^[A-Za-z0-9._()-]+\.(png|jpg|jpeg|gif|webp)$/i.test(file)) {
      return res.status(400).json({ error: 'Invalid image filename' });
    }

    const filePath = path.join(projectRoot, 'public', file);
    res.type(path.extname(filePath));
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving image file:', err);
        res.status(404).json({ error: 'Image not found' });
      }
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
  });

  // TEMPORARY: QA setup endpoint
  app.post('/api/qa-setup', async (_req, res) => {
    try {
      console.log('Setting up QA accounts...');

      // Ensure test school exists
      let school = await MongoSchool.findOne({ name: 'Test School' });
      if (!school) {
        school = await MongoSchool.create({
          id: 'school-1',
          name: 'Test School',
        } as any);
        console.log('Created test school');
      }

      // Create QA teacher
      let teacherUser = await MongoUser.findOne({ username: 'qa_teacher' });
      if (!teacherUser) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        teacherUser = await MongoUser.create({
          id: 'qa-teacher-' + Date.now(),
          username: 'qa_teacher',
          password: hashedPassword
        });
        console.log('Created qa_teacher user');
      }

      let teacherProfile = await MongoProfile.findOne({ id: teacherUser.id });
      if (!teacherProfile) {
        teacherProfile = await MongoProfile.create({
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
      let studentUser = await MongoUser.findOne({ username: 'qa_student' });
      if (!studentUser) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        studentUser = await MongoUser.create({
          id: 'qa-student-' + Date.now(),
          username: 'qa_student',
          password: hashedPassword
        });
        console.log('Created qa_student user');
      }

      let studentProfile = await MongoProfile.findOne({ id: studentUser.id });
      if (!studentProfile) {
        studentProfile = await MongoProfile.create({
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

      res.json({ ok: true, message: 'QA accounts created successfully' });
    } catch (err: any) {
      console.error('QA setup error:', err);
      res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // One-time admin password fix endpoint (public, safe — only fixes admin123 to its canonical password)
  app.post('/api/fix-admin-password', async (_req, res) => {
    const memUsers = (storage as any).users as Map<string, any>;
    const bcryptLib = await import('bcrypt');
    const correctHash = await bcryptLib.hash('admin@1234', 10);
    let fixed = false;
    memUsers.forEach((u: any, id: string) => {
      if (u.username === 'admin123') {
        memUsers.set(id, { ...u, password: correctHash });
        fixed = true;
        console.log('[FixAdmin] Patched admin123 password hash in memory');
      }
    });
    await (storage as any).flushSave?.();
    res.json({ ok: true, fixed });
  });

  app.get('/api/stats', async (_req, res) => {
    const [
      activeStudents,
      dedicatedTeachers,
      partnerSchools,
      tasksCompleted,
    ] = await Promise.all([
      MongoProfile.countDocuments({ role: 'student' }),
      MongoProfile.countDocuments({ role: 'teacher' }),
      MongoSchool.countDocuments({}),
      MongoSubmission.countDocuments({}),
    ]);

    // Games and eco points are transitioning from legacy logic; keep this endpoint stable during cutover.
    const games = await (storage as any).listGames?.();
    const interactiveGames = Array.isArray(games) ? games.length : 0;
    const ecoPointsEarned = 0;

    res.json({
      activeStudents,
      dedicatedTeachers,
      partnerSchools,
      ecoPointsEarned,
      interactiveGames,
      tasksCompleted,
    });
  });

  // Games catalog (public)
  app.get('/api/games', async (_req, res) => {
    const list = await (storage as any).listGames();
    res.json(list);
  });

  // Schools
  app.get('/api/schools', async (_req, res) => {
    const schools = await storage.listSchools();
    res.json(schools);
  });

  const resolveSchoolIdFromInput = async (rawSchool: unknown): Promise<string | null> => {
    const input = String(rawSchool ?? '').trim();
    if (!input) return null;

    const school = await storage.getOrCreateSchoolByName(input);
    console.log(`[Routes] School resolved: "${input}" -> schoolId=${school.id}`);
    return school.id;
  };

  // Admin: add a new school/college (demo; no auth guard here)
  app.post('/api/admin/schools', async (req, res) => {
    const { name } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Invalid school name' });
    }
    const created = await storage.addSchool(name.trim());
    res.json(created);
  });

  // Admin: delete a school/college by id
  app.delete('/api/admin/schools/:id', async (req, res) => {
    const ok = await storage.removeSchool(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  // Signups
  app.post('/api/signup/student', async (req, res) => {
    const { name, email, username, schoolId, id, rollNumber, className, section, photoDataUrl, password } = req.body ?? {};
    if (!name || !email || !username || !schoolId || !id) return res.status(400).json({ error: 'Missing fields' });
    if (!(await storage.isUsernameAvailable(username))) return res.status(409).json({ error: 'Username taken' });

    const resolvedSchoolId = await resolveSchoolIdFromInput(schoolId);
    if (!resolvedSchoolId) return res.status(400).json({ error: 'Invalid school name' });

    const appData: StudentApplication = {
      name,
      email,
      username,
      schoolId: resolvedSchoolId,
      studentId: id,
      rollNumber,
      className,
      section,
      photoDataUrl,
      password,
    };
    const created = await storage.addStudentApplication(appData);

    console.log('Signup student: admin notification triggered for', created.username);
    sendAdminNotification({
      username: created.username,
      role: 'student',
      email: created.email,
      school: schoolId || 'N/A',
    });

    res.json(created);
  });

  app.post('/api/signup/teacher', async (req, res) => {
    const { name, email, username, schoolId, id, subject, photoDataUrl, password } = req.body ?? {};
    if (!name || !email || !username || !schoolId || !id) return res.status(400).json({ error: 'Missing fields' });
    if (!(await storage.isUsernameAvailable(username))) return res.status(409).json({ error: 'Username taken' });

    const resolvedSchoolId = await resolveSchoolIdFromInput(schoolId);
    if (!resolvedSchoolId) return res.status(400).json({ error: 'Invalid school name' });

    const appData: TeacherApplication = {
      name,
      email,
      username,
      schoolId: resolvedSchoolId,
      teacherId: id,
      subject,
      photoDataUrl,
      password,
    };
    const created = await storage.addTeacherApplication(appData);

    console.log('Signup teacher: admin notification triggered for', created.username);
    sendAdminNotification({
      username: created.username,
      role: 'teacher',
      email: created.email,
      school: schoolId || 'N/A',
    });

    res.json(created);
  });

  // Admin approvals
  app.get('/api/admin/pending', async (_req, res) => {
    const data = await storage.listPending();
    res.json({
      students: data.students.map(({ password, ...rest }: any) => rest),
      teachers: data.teachers.map(({ password, ...rest }: any) => rest),
    });
  });

  app.post('/api/admin/approve/:type/:id', async (req, res) => {
    const type = req.params.type === 'student' ? 'student' : 'teacher';
    const ok = await storage.approveApplication(type, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  // Convenience: approve all pending applications (demo helper)
  app.post('/api/admin/approve-all', async (_req, res) => {
    const data = await storage.listPending();
    let approvedStudents = 0;
    let approvedTeachers = 0;
    for (const s of data.students) {
      const ok = await storage.approveApplication('student', s.id!);
      if (ok) approvedStudents++;
    }
    for (const t of data.teachers) {
      const ok = await storage.approveApplication('teacher', t.id!);
      if (ok) approvedTeachers++;
    }
    res.json({ ok: true, approvedStudents, approvedTeachers });
  });

  // Reject a pending student application
  app.post('/api/admin/reject-student', async (req, res) => {
    const { applicationId } = req.body ?? {};
    if (!applicationId) return res.status(400).json({ error: 'Missing applicationId' });
    const ok = await (storage as any).rejectStudent(applicationId);
    if (!ok) return res.status(404).json({ error: 'Application not found' });
    res.json({ ok: true });
  });

  // Reject a pending teacher application
  app.post('/api/admin/reject-teacher', async (req, res) => {
    const { applicationId } = req.body ?? {};
    if (!applicationId) return res.status(400).json({ error: 'Missing applicationId' });
    const ok = await (storage as any).rejectTeacher(applicationId);
    if (!ok) return res.status(404).json({ error: 'Application not found' });
    res.json({ ok: true });
  });

  // Admin: list users (demo; excludes passwords)
  app.get('/api/admin/users', async (_req, res) => {
  const users = await MongoUser.find({}).select({ id: 1, username: 1 }).lean();
  const userIds = users.map((u: any) => String(u.id));
  const profiles = await MongoProfile.find({ id: { $in: userIds } }).select({ id: 1, role: 1 }).lean();
  const roleByUserId = new Map(profiles.map((p: any) => [String(p.id), String(p.role || 'student')]));
  const list = users.map((u: any) => ({ username: String(u.username), role: (roleByUserId.get(String(u.id)) || 'student') as 'student' | 'teacher' | 'admin' }));
    res.json(list);
  });

  // Admin: full user details by username
  app.get('/api/admin/user/:username', async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const details = await (storage as any).getUserDetails(username);
    if (!details || typeof details !== 'object') return res.json(details);
    const { password, ...safeDetails } = details;
    res.json(safeDetails);
  });

  // Admin: reset password for a username (demo only, no auth)
  app.post('/api/admin/reset-password', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const ok = await storage.resetPassword(username, password);
  if (!ok) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
  });

  // Admin: unapprove a user (move back to pending)
  app.post('/api/admin/unapprove', async (req, res) => {
    const { username } = req.body ?? {};
    if (!username) return res.status(400).json({ error: 'Missing username' });
    const ok = await storage.unapproveUser(username);
    if (!ok) return res.status(404).json({ error: 'User not found or cannot be unapproved' });
    res.json({ ok: true });
  });

  // Username and OTP
  app.get('/api/username-available/:username', async (req, res) => {
    const available = await storage.isUsernameAvailable(req.params.username);
    res.json({ available });
  });

  // Login — MongoDB only
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    console.log("AUTH: using MongoDB");

    // Look up user in MongoDB via storage layer
    const foundUser = await storage.getUserByUsername(String(username));
    if (!foundUser) return res.status(401).json({ ok: false });

    const isValidPassword = await bcrypt.compare(String(password), String((foundUser as any).password || ''));
    if (!isValidPassword) return res.status(401).json({ ok: false });

    // Look up role from MongoDB profile
    const profile = await MongoProfile.findOne({ id: String((foundUser as any).id) }).select({ role: 1 }).lean();
    const role = (((profile as any)?.role) || 'student') as SessionRole;

    const now = Date.now();
    const token = issueAuthToken({
      username: String((foundUser as any).username),
      role,
      sessionStart: now,
      lastActivityAt: now,
    });
    setAuthCookie(res, token);

    res.json({
      ok: true,
      role,
      username: String((foundUser as any).username),
      idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
      absoluteTimeoutMs: SESSION_ABSOLUTE_TIMEOUT_MS,
    });
  });


  app.post('/api/logout', async (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/session', async (req, res) => {
    const session = getActiveSession(req, res);
    if (!session) return res.status(401).json({ ok: false });
    const now = Date.now();
    res.json({
      ok: true,
      username: session.username,
      role: session.role,
      expiresInMs: Math.min(
        SESSION_IDLE_TIMEOUT_MS - (now - session.lastActivityAt),
        SESSION_ABSOLUTE_TIMEOUT_MS - (now - session.sessionStart),
      ),
    });
  });

  app.post('/api/session/ping', async (req, res) => {
    const session = getActiveSession(req, res);
    if (!session) return res.status(401).json({ ok: false });
    const now = Date.now();
    res.json({
      ok: true,
      expiresInMs: Math.min(
        SESSION_IDLE_TIMEOUT_MS - (now - session.lastActivityAt),
        SESSION_ABSOLUTE_TIMEOUT_MS - (now - session.sessionStart),
      ),
    });
  });

  // Public: application status by username (pending/approved/none)
  app.get('/api/application-status/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    try {
      const status = await storage.getApplicationStatus(username);
      res.json({ status });
    } catch (e) {
      res.status(500).json({ error: 'Status check failed' });
    }
  });

  app.post('/api/otp/request', async (req, res) => {
    const { email } = req.body ?? {};
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail) return res.status(400).json({ error: 'Email required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await storage.saveOtp(normalizedEmail, code, 5 * 60 * 1000);

    // Send email asynchronously without awaiting (fire and forget)
    sendEmail({
      to: normalizedEmail,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${code}. It expires in 5 minutes.`,
      html: `<p>Your OTP is: <strong>${code}</strong>. It expires in 5 minutes.</p>`,
    }).catch((err) => {
      console.error('Email send error:', err);
    });

    // Respond immediately - OTP is already saved in storage
    res.json({ ok: true });
  });
  

  app.post('/api/otp/verify', async (req, res) => {
    const { email, code } = req.body ?? {};
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const ok = await storage.verifyOtp(email, code);
    res.json({ ok });
  });

  app.post('/api/contact', async (req, res) => {
    const { name, email, category, subject, message } = req.body ?? {};
    const senderName = String(name || '').trim();
    const senderEmail = String(email || '').trim();
    const contactCategory = String(category || '').trim();
    const contactSubject = String(subject || '').trim();
    const contactMessage = String(message || '').trim();

    if (!senderName || !senderEmail || !contactCategory || !contactSubject || !contactMessage) {
      return res.status(400).json({ error: 'All contact fields are required' });
    }

    const supportInbox = process.env.EMAIL || process.env.GMAIL_USER || process.env.SUPPORT_EMAIL || 'ecoverse.academy@gmail.com';

    await sendEmail({
      to: supportInbox,
      subject: `[Contact:${contactCategory}] ${contactSubject}`,
      text: `Name: ${senderName}\nEmail: ${senderEmail}\nCategory: ${contactCategory}\nSubject: ${contactSubject}\n\nMessage:\n${contactMessage}`,
      replyTo: senderEmail,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #111827;">
          <div style="background: linear-gradient(135deg, #0f766e 0%, #16a34a 100%); color: white; padding: 20px 24px; border-radius: 14px 14px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">EcoVerse Contact Request</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 14px 14px;">
            <p><strong>Name:</strong> ${senderName}</p>
            <p><strong>Email:</strong> ${senderEmail}</p>
            <p><strong>Category:</strong> ${contactCategory}</p>
            <p><strong>Subject:</strong> ${contactSubject}</p>
            <div style="margin-top: 18px; padding: 16px; background: #f9fafb; border-radius: 12px; white-space: pre-wrap;">
              ${contactMessage}
            </div>
          </div>
        </div>
      `,
    });

    res.json({ ok: true, deliveredTo: supportInbox });
  });

  // ===== Self Profile (Teacher/Student/Admin) =====
  app.get('/api/me/profile', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const p = await (storage as any).getOwnProfile(current);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  });
  app.put('/api/me/profile', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const r = await (storage as any).updateOwnProfile(current, req.body ?? {});
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.profile);
  });

  // Admin accounts CRUD
  app.get('/api/admin/admins', async (_req, res) => {
    const list = await storage.listAdmins();
    res.json(list);
  });
  app.post('/api/admin/admins', async (req, res) => {
    const { username, password, name, email } = req.body ?? {};
    const r = await storage.createAdmin({ username, password, name, email });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });
  app.put('/api/admin/admins/:username', async (req, res) => {
    const current = (req.headers['x-username'] as string) || undefined;
    const r = await storage.updateAdmin(req.params.username, req.body ?? {}, current);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });
  app.delete('/api/admin/admins/:username', async (req, res) => {
    const r = await storage.deleteAdmin(req.params.username);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // Dev-only seeding of teacher tasks
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/dev/seed-teacher-tasks', async (req, res) => {
      try {
        const teacher = (req.body?.username as string) || 'test_teacher';
        const count = Number.isFinite(req.body?.count) ? Math.max(1, Math.min(100, Number(req.body.count))) : 12;
        const create = async (input: any) => {
          return await (storage as any).createTask(teacher, input);
        };
        const pool = [
          { title: 'Recycle Drive', description: 'Collect and sort recyclables from your neighborhood.', maxPoints: 8, proofType: 'photo', groupMode: 'group', maxGroupSize: 4 },
          { title: 'Plant a Tree', description: 'Plant a sapling and document the process.', maxPoints: 10, proofType: 'photo', groupMode: 'solo' },
          { title: 'Clean-Up Challenge', description: 'Clean a local area and show before/after photos.', maxPoints: 9, proofType: 'photo', groupMode: 'group', maxGroupSize: 5 },
          { title: 'Water Audit', description: 'Audit household water usage and suggest savings.', maxPoints: 7, proofType: 'text', groupMode: 'solo' },
          { title: 'Energy Saver Week', description: 'Track and reduce electricity consumption for a week.', maxPoints: 8, proofType: 'text', groupMode: 'solo' },
          { title: 'Eco Poster', description: 'Design a poster promoting an eco-friendly habit.', maxPoints: 6, proofType: 'photo', groupMode: 'solo' },
          { title: 'Compost Starter', description: 'Start a compost bin and log the steps.', maxPoints: 8, proofType: 'photo', groupMode: 'group', maxGroupSize: 3 },
          { title: 'Biodiversity Walk', description: 'List 10 species found in your area with photos.', maxPoints: 9, proofType: 'photo', groupMode: 'group', maxGroupSize: 4 },
          { title: 'Plastic-Free Day', description: 'Go plastic-free for a day and report findings.', maxPoints: 7, proofType: 'text', groupMode: 'solo' },
          { title: 'Rainwater Harvesting Plan', description: 'Draft a simple harvesting plan for your building.', maxPoints: 10, proofType: 'text', groupMode: 'group', maxGroupSize: 4 },
          { title: 'School Garden Duty', description: 'Maintain a garden patch for a week.', maxPoints: 8, proofType: 'photo', groupMode: 'group', maxGroupSize: 5 },
          { title: 'Green Transport Day', description: 'Use non-motorized or public transport; log your route.', maxPoints: 6, proofType: 'text', groupMode: 'solo' },
        ];
        const created: any[] = [];
        for (let i = 0; i < count; i++) {
          const base = pool[i % pool.length];
          const variant = {
            ...base,
            title: `${base.title} #${i + 1}`,
            deadline: undefined,
          };
          const r = await create(variant);
          if (r?.ok) created.push(r.task);
        }
        res.json({ ok: true, count: created.length, username: teacher });
      } catch (e) {
        res.status(500).json({ error: 'Seed failed' });
      }
    });
    // Dev: seed quizzes (supports bulk). If no body provided, falls back to demo seeding.
    app.post('/api/dev/seed-quizzes', async (req, res) => {
      try {
        const body = req.body ?? {};
        const adminCount = Number.isFinite(body.adminCount) ? Math.max(0, Math.min(100, Number(body.adminCount))) : undefined;
        const teacherCount = Number.isFinite(body.teacherCount) ? Math.max(0, Math.min(100, Number(body.teacherCount))) : undefined;
        const adminUsername = (body.adminUsername as string) || 'admin123';
        const teacherUsername = (body.teacherUsername as string) || 'test_teacher';

        if (adminCount == null && teacherCount == null) {
          // Back-compat: simple demo seed via storage helper
          const { storage } = await import('./storage');
          (storage as any).seedDemoQuizzes?.();
          return res.json({ ok: true, mode: 'demo' });
        }

        // Build quiz factory
        const topics = [
          'Climate Action', 'Oceans', 'Forests', 'Wildlife', 'Renewables',
          'Water Conservation', 'Recycling', 'Pollution', 'Sustainable Cities', 'Energy Efficiency',
          'Biodiversity', 'Soil Health', 'Green Transport', 'Circular Economy', 'Air Quality',
        ];
        const optBank = [
          'Reduce carbon emissions', 'Increase plastic use', 'Cut more trees', 'Ignore pollution',
          'Install solar panels', 'Burn more coal', 'Dump waste in oceans', 'Save energy at home',
        ];
        const makeQuestion = (qIdx: number) => {
          const correctIndex = Math.floor(Math.random() * 4);
          const base = qIdx % (optBank.length - 4);
          const options = [0,1,2,3].map((i) => optBank[(base + i) % optBank.length]);
          const text = `Q${qIdx + 1}. Choose the best eco-friendly action.`;
          return { id: qIdx + 1, text, options, answerIndex: correctIndex };
        };
        const makeQuiz = (i: number, scope: 'global' | 'school') => {
          const title = `${scope === 'global' ? 'Global' : 'School'} Quiz ${i + 1}: ${topics[i % topics.length]}`;
          const description = `Test your knowledge on ${topics[i % topics.length]}.`;
          const points = 10 + (i % 5) * 2;
          const questions = Array.from({ length: 5 }, (_, qi) => makeQuestion(qi));
          return { title, description, points, questions };
        };

        let adminCreated = 0;
        let teacherCreated = 0;
        const createAdminQuiz = async (q: any) => {
          const r = await (storage as any).createAdminQuiz(adminUsername, q);
          if (r?.ok !== false) adminCreated++;
        };
        const createTeacherQuiz = async (q: any) => {
          const r = await (storage as any).createQuiz(teacherUsername, q);
          if (r?.ok !== false) teacherCreated++;
        };

        // Ensure teacher/admin may exist (best-effort, ignore failures if already present)
        try { await (storage as any).createAdmin?.({ username: adminUsername, password: 'admin@1234', name: 'Admin', email: `${adminUsername}@example.com` }); } catch {}

        // Seed admin quizzes
        if (adminCount && adminCount > 0) {
          for (let i = 0; i < adminCount; i++) {
            await createAdminQuiz(makeQuiz(i, 'global'));
          }
        }
        // Seed teacher quizzes
        if (teacherCount && teacherCount > 0) {
          for (let i = 0; i < teacherCount; i++) {
            await createTeacherQuiz(makeQuiz(i, 'school'));
          }
        }

        res.json({ ok: true, adminCreated, teacherCreated, adminUsername, teacherUsername });
      } catch (e) {
        res.status(500).json({ error: 'Seed failed' });
      }
    });

    // Dev: seed many schools and approved students for leaderboard demos
    app.post('/api/dev/seed-schools-students', async (req, res) => {
      try {
        const body = req.body ?? {};
        const schools = Math.max(0, Math.min(100, Math.floor(Number(body.schools) || 0)));
        const students = Math.max(0, Math.min(10000, Math.floor(Number(body.students) || 0)));
        const adminUsername = (body.adminUsername as string) || 'admin123';
        const r = await (storage as any).seedSchoolsAndStudents({ schools, students, adminUsername });
        res.json({ ok: true, ...r, adminUsername });
      } catch (e) {
        res.status(500).json({ error: 'Seed failed' });
      }
    });
  }

  // ===== Teacher & Student: Tasks and Submissions =====
  // Create a new task (Teacher only)
  app.post('/api/teacher/tasks', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, description, deadline, proofType, maxPoints, groupMode, maxGroupSize } = req.body ?? {};
    const r = await (storage as any).createTask(current, { title, description, deadline, proofType, maxPoints, groupMode, maxGroupSize });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r);
  });
  // List tasks created by this teacher
  app.get('/api/teacher/tasks', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listTeacherTasks(current);
    res.json(list);
  });
  // List submissions for teacher (optionally by task)
  app.get('/api/teacher/submissions', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const taskId = (req.query.taskId as string) || undefined;
    const list = await (storage as any).listSubmissionsForTeacher(current, taskId);
    res.json(list);
  });
  // Review a submission (approve/reject with points)
  app.post('/api/teacher/submissions/:id/review', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { status, points, feedback } = req.body ?? {};
    const r = await (storage as any).reviewSubmission(current, req.params.id, { status, points, feedback });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });
  // Student: list available tasks (for their school) with submission status
  app.get('/api/student/tasks', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listStudentTasks(current);
    res.json(list);
  });
  // Student: submit task proof (photo data URL)
  app.post('/api/student/tasks/:id/submit', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { photoDataUrl, photos } = req.body ?? {};
    const payload = Array.isArray(photos) ? photos : photoDataUrl;
    const r = await (storage as any).submitTask(current, req.params.id, payload);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r);
  });

  // Groups: create or fetch
  app.post('/api/student/tasks/:id/group', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { members } = req.body ?? {};
    const r = await (storage as any).createTaskGroup(current, req.params.id, members || []);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r);
  });
  app.get('/api/student/tasks/:id/group', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const g = await (storage as any).getTaskGroupForStudent(current, req.params.id);
    res.json(g);
  });

  // ===== Teacher: Announcements =====
  app.post('/api/teacher/announcements', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, body } = req.body ?? {};
    const r = await (storage as any).createAnnouncement(current, { title, body });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.announcement);
  });
  app.get('/api/teacher/announcements', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listAnnouncementsForTeacher(current);
    res.json(list);
  });

  // ===== Admin: Global Announcements =====
  app.post('/api/admin/announcements', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, body } = req.body ?? {};
    const r = await (storage as any).createAdminAnnouncement(current, { title, body });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.announcement);
  });
  app.get('/api/admin/announcements', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listAdminAnnouncements(current);
    res.json(list);
  });
  app.put('/api/admin/announcements/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, body } = req.body ?? {};
    const r = await (storage as any).updateAdminAnnouncement(current, req.params.id, { title, body });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.announcement);
  });
  app.delete('/api/admin/announcements/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).deleteAdminAnnouncement(current, req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Student: Announcements (global + school) =====
  app.get('/api/student/announcements', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listStudentAnnouncements(current);
    res.json(list);
  });

  // ===== Teacher: Assignments =====
  app.post('/api/teacher/assignments', async (req, res) => {
    console.log('ROUTE HIT: createAssignment');
    const current = (req.headers['x-username'] as string) || '';
    const { title, description, deadline, maxPoints } = req.body ?? {};
    const r = await storage.createAssignment(current, { title, description, deadline, maxPoints });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.assignment);
  });
  app.get('/api/teacher/assignments', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listTeacherAssignments(current);
    res.json(list);
  });

  // ===== Admin: Global Assignments =====
  app.post('/api/admin/assignments', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, description, deadline, maxPoints } = req.body ?? {};
    const r = await (storage as any).createAdminAssignment(current, { title, description, deadline, maxPoints });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.assignment);
  });
  app.get('/api/admin/assignments', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listAdminAssignments(current);
    res.json(list);
  });
  app.put('/api/admin/assignments/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, description, deadline, maxPoints } = req.body ?? {};
    const r = await (storage as any).updateAdminAssignment(current, req.params.id, { title, description, deadline, maxPoints });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.assignment);
  });
  app.delete('/api/admin/assignments/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).deleteAdminAssignment(current, req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });
  app.get('/api/admin/assignment-submissions', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const assignmentId = (req.query.assignmentId as string) || undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const result = await (storage as any).listAssignmentSubmissionsForAdmin(current, assignmentId, page, limit);
    res.json(result);
  });
  app.post('/api/admin/assignment-submissions/:id/review', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { status, points, feedback } = req.body ?? {};
    const r = await (storage as any).reviewAdminAssignmentSubmission(current, req.params.id, { status, points, feedback });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Student: Assignments & Submissions =====
  app.get('/api/student/assignments', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listStudentAssignments(current);
    res.json(list);
  });
  app.post('/api/student/assignments/:id/submit', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { files } = req.body ?? {};
    const payload = Array.isArray(files) ? files : [];
    const r = await (storage as any).submitAssignment(current, req.params.id, payload);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r);
  });

  // ===== Teacher: Assignment Submissions review =====
  app.get('/api/teacher/assignment-submissions', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const assignmentId = (req.query.assignmentId as string) || undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const result = await (storage as any).listAssignmentSubmissionsForTeacher(current, assignmentId, page, limit);
    res.json(result);
  });
  app.post('/api/teacher/assignment-submissions/:id/review', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { status, points, feedback } = req.body ?? {};
    const r = await (storage as any).reviewAssignmentSubmission(current, req.params.id, { status, points, feedback });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Teacher: Quizzes =====
  app.post('/api/teacher/quizzes', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, description, points, questions } = req.body ?? {};
    const r = await (storage as any).createQuiz(current, { title, description, points, questions });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.quiz);
  });
  app.get('/api/teacher/quizzes', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listTeacherQuizzes(current);
    res.json(list);
  });
  // Update a teacher quiz
  app.put('/api/teacher/quizzes/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).updateQuiz(current, req.params.id, req.body ?? {});
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.quiz);
  });
  // Delete a teacher quiz
  app.delete('/api/teacher/quizzes/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).deleteQuiz(current, req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Admin: Global Quizzes =====
  app.post('/api/admin/quizzes', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const { title, description, points, questions } = req.body ?? {};
    const r = await (storage as any).createAdminQuiz(current, { title, description, points, questions });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.quiz);
  });
  app.get('/api/admin/quizzes', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listAdminQuizzes(current);
    res.json(list);
  });
  // Update a global quiz (admin)
  app.put('/api/admin/quizzes/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).updateAdminQuiz(current, req.params.id, req.body ?? {});
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.quiz);
  });
  // Delete a global quiz (admin)
  app.delete('/api/admin/quizzes/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).deleteAdminQuiz(current, req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Student: Discover quizzes =====
  app.get('/api/student/quizzes', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listStudentQuizzes(current);
    const sanitized = (Array.isArray(list) ? list : []).map((q: any) => ({
      ...q,
      questions: (q.questions || []).map((qq: any) => ({ id: qq.id, text: qq.text, options: qq.options })),
    }));
    res.json(sanitized);
  });

  // ===== Admin: Games management =====
  app.get('/api/admin/games', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listAdminGames(current);
    res.json(list);
  });
  app.post('/api/admin/games', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).createAdminGame(current, req.body ?? {});
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.game);
  });
  app.put('/api/admin/games/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).updateAdminGame(current, req.params.id, req.body ?? {});
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.game);
  });
  app.delete('/api/admin/games/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).deleteAdminGame(current, req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // Student: fetch own attempt for a quiz
  app.get('/api/student/quizzes/:id/attempt', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const a = await (storage as any).getStudentQuizAttempt(current, req.params.id);
    res.json(a || null);
  });

  // Public: fetch quiz by id (metadata without answers)
  app.get('/api/quizzes/:id', async (req, res) => {
    const q = await (storage as any).getQuizById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    const sanitized = { ...q, questions: q.questions.map((qq: any) => ({ id: qq.id, text: qq.text, options: qq.options })) };
    res.json(sanitized);
  });

  // Secure scoring: compute score server-side using answer keys
  app.post('/api/quizzes/:id/score', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const q = await (storage as any).getQuizById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    // ensure only students can score and quiz is available to them
    const me = await (storage as any).getOwnProfile(current);
    if (!me || me.role !== 'student') return res.status(403).json({ error: 'Only students can attempt' });
    const schoolId = me.schoolId;
    const allowed = q.visibility === 'global' || (!!schoolId && q.schoolId === schoolId);
    if (!allowed) return res.status(403).json({ error: 'Quiz not available' });
    const answers: number[] = Array.isArray(req.body?.answers) ? req.body.answers.map((n: any) => Number(n)) : [];
    const total = q.questions.length || 0;
    if (total === 0) return res.json({ ok: true, correct: 0, total: 0, percent: 0 });
    let correct = 0;
      const details: Array<{ index: number; correctIndex: number; selected: number; isCorrect: boolean }> = [];
      for (let i = 0; i < total; i++) {
        const choice = answers[i];
        const correctIndex = (q.questions[i] as any).answerIndex;
        const isCorrect = Number.isFinite(choice) && choice === correctIndex;
        if (isCorrect) correct++;
        details.push({ index: i, correctIndex, selected: Number.isFinite(choice) ? choice : -1, isCorrect });
    }
    const percent = Math.round((correct / total) * 100);
    res.json({ ok: true, correct, total, percent, details });
  });

  // ===== Teacher: Students & Overview =====
  app.get('/api/teacher/students', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listStudentsForTeacher(current);
    res.json(list);
  });
  app.get('/api/teacher/overview', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    console.log(`[ROUTE] /api/teacher/overview called for user: ${current}`);
    const data = await (storage as any).getTeacherOverview(current);
    console.log(`[ROUTE] /api/teacher/overview returning:`, data);
    res.json(data);
  });

  // ===== Student Profile (view + privacy)
  app.get('/api/student/profile', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const p = await (storage as any).getStudentProfile(current);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  });
  app.put('/api/student/profile/privacy', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const allow = !!(req.body?.allowExternalView);
    const r = await mongoStorage.setStudentPrivacy(current, allow);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Learning modules =====
  app.get('/api/learning/progress', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const list = await (storage as any).listLessonCompletions(current);
    const totalLessonPoints = list.reduce((acc: number, lc: any) => acc + Number(lc.points || 0), 0);
    res.json({ completions: list, totalLessonPoints });
  });

  app.post('/api/learning/complete', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const { moduleId, moduleTitle, lessonId, lessonTitle, points } = req.body ?? {};
    const r = await (storage as any).completeLesson(current, { moduleId, moduleTitle, lessonId, lessonTitle, points });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r);
  });

  // Save last opened lesson
  app.post('/api/learning/last-lesson', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const { moduleId, moduleTitle, lessonId, lessonTitle } = req.body ?? {};
    try {
      const updated = await MongoProfile.findOneAndUpdate(
        { id: current },
        {
          lastLessonOpened: {
            moduleId,
            moduleTitle,
            lessonId,
            lessonTitle,
            openedAt: new Date(),
          },
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Profile not found' });
      res.json({ ok: true, lastLessonOpened: updated.lastLessonOpened });
    } catch (error) {
      console.error('Error saving last lesson:', error);
      res.status(500).json({ error: 'Failed to save last lesson' });
    }
  });

  // Get last opened lesson
  app.get('/api/learning/last-lesson', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    try {
      const profile = await MongoProfile.findOne({ id: current });
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      res.json({ ok: true, lastLessonOpened: profile.lastLessonOpened || null });
    } catch (error) {
      console.error('Error getting last lesson:', error);
      res.status(500).json({ error: 'Failed to get last lesson' });
    }
  });

  app.get('/api/modules', async (_req, res) => {
    const list = await mongoStorage.listLearningModules();
    res.json(list);
  });

  app.get('/api/learning/modules', async (_req, res) => {
    const list = await mongoStorage.listLearningModules();
    res.json(list);
  });

  app.get('/api/admin/learning/modules', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listManagedLearningModules(current);
    res.json(list);
  });

  app.post('/api/admin/learning/modules', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).upsertManagedLearningModule(current, req.body ?? {});
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.module);
  });

  app.put('/api/admin/learning/modules/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).upsertManagedLearningModule(current, { ...(req.body ?? {}), id: req.params.id });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.module);
  });

  app.delete('/api/admin/learning/modules/:id', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).deleteManagedLearningModule(current, req.params.id);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // Bulk import environmental learning modules
  app.post('/api/admin/learning/modules/bulk-import', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Authentication required' });

    try {
      const environmentalModules = [
        {
          title: "MULTIDISCIPLINARY NATURE OF ENVIRONMENTAL STUDIES",
          description: "Understanding the multidisciplinary nature of environmental studies and the need for public awareness",
          lessons: [
            { title: "Definition", points: 5 },
            { title: "Scope", points: 5 },
            { title: "Importance", points: 5 },
            { title: "Need for Public Awareness", points: 5 }
          ],
          link: "https://environmutli.netlify.app/"
        },
        {
          title: "NATURAL RESOURCES: RENEWABLE AND NON-RENEWABLE RESOURCES",
          description: "Comprehensive study of natural resources, their problems, and conservation strategies",
          lessons: [
            { title: "Natural resources and Associated problems", points: 5 },
            { title: "Forest Resources", points: 5 },
            { title: "Water Resources", points: 5 },
            { title: "Mineral Resources", points: 5 },
            { title: "Food Resources", points: 5 },
            { title: "Energy Resources", points: 5 },
            { title: "Land Resources", points: 5 },
            { title: "Role of Individual in Conservation", points: 5 },
            { title: "Sustainable Life Styles", points: 5 }
          ],
          link: "https://naturalresources2.netlify.app/"
        },
        {
          title: "ECOSYSTEMS",
          description: "Understanding ecosystems, their structure, functions, and ecological processes",
          lessons: [
            { title: "Concept of Ecosystem", points: 5 },
            { title: "Structure and Functions", points: 5 },
            { title: "Producers, Consumers, Decomposers", points: 5 },
            { title: "Energy Flow", points: 5 },
            { title: "Food Chains & Webs", points: 5 },
            { title: "Ecological Pyramids", points: 5 },
            { title: "Types of Ecosystems", points: 5 },
            { title: "Ecological Succession", points: 5 }
          ],
          link: "https://ecosystem4.netlify.app/"
        },
        {
          title: "BIODIVERSITY AND ITS CONSERVATION",
          description: "Exploring biodiversity levels, values, threats, and conservation strategies",
          lessons: [
            { title: "Levels of Biodiversity", points: 5 },
            { title: "Value of Biodiversity", points: 5 },
            { title: "Threats", points: 5 },
            { title: "Endangered Species", points: 5 },
            { title: "Conservation Methods", points: 5 },
            { title: "India Biodiversity Hotspots", points: 5 },
            { title: "Conservation Efforts", points: 5 }
          ],
          link: "https://biosphere6.netlify.app/"
        },
        {
          title: "ENVIRONMENTAL POLLUTION",
          description: "Comprehensive study of various types of environmental pollution and management strategies",
          lessons: [
            { title: "Introduction", points: 5 },
            { title: "Air Pollution", points: 5 },
            { title: "Water Pollution", points: 5 },
            { title: "Soil Pollution", points: 5 },
            { title: "Marine Pollution", points: 5 },
            { title: "Noise & Thermal Pollution", points: 5 },
            { title: "Nuclear Hazards", points: 5 },
            { title: "Waste Management", points: 5 },
            { title: "Prevention", points: 5 },
            { title: "Case Studies", points: 5 },
            { title: "Disaster Management", points: 5 }
          ],
          link: "https://environpollut7.netlify.app/"
        },
        {
          title: "SOCIAL ISSUES AND THE ENVIRONMENT",
          description: "Exploring social issues related to environment, sustainable development, and environmental ethics",
          lessons: [
            { title: "Sustainable Development", points: 5 },
            { title: "Urban Energy Problems", points: 5 },
            { title: "Water Conservation", points: 5 },
            { title: "Rainwater Harvesting", points: 5 },
            { title: "Rehabilitation Issues", points: 5 },
            { title: "Environmental Ethics", points: 5 },
            { title: "Climate Change Issues", points: 5 },
            { title: "Waste Management", points: 5 },
            { title: "Wildlife Protection Laws", points: 5 },
            { title: "Environmental Legislation", points: 5 }
          ],
          link: "https://indianenviron.netlify.app/"
        },
        {
          title: "HUMAN POPULATION AND ENVIRONMENT",
          description: "Understanding human population dynamics and their impact on the environment",
          lessons: [
            { title: "Population Growth", points: 5 },
            { title: "Population Explosion", points: 5 },
            { title: "Human Health", points: 5 },
            { title: "Human Rights", points: 5 },
            { title: "Value Education", points: 5 },
            { title: "HIV/AIDS", points: 5 },
            { title: "Women & Child Welfare", points: 5 },
            { title: "Role of IT", points: 5 }
          ],
          link: "https://humanandenviron.netlify.app/"
        }
      ];

      let created = 0;
      let updated = 0;

      for (const moduleData of environmentalModules) {
        // Check if module exists (case-insensitive title match)
        const existingModule = await LearningModule.findOne({
          title: { $regex: new RegExp(`^${moduleData.title}$`, 'i') }
        });

        // Prepare lessons with proper structure
        const lessons = moduleData.lessons.map((lesson, index) => ({
          id: (index + 1).toString(),
          title: lesson.title,
          duration: '10 minutes',
          content: `<h2>${lesson.title}</h2><p>Content for ${lesson.title} will be available at: <a href="${moduleData.link}" target="_blank">${moduleData.link}</a></p>`,
          points: lesson.points,
          order: index,
          quiz: {
            questions: [] // Empty quiz for now
          }
        }));

        if (existingModule) {
          // Update existing module
          await LearningModule.updateOne(
            { _id: existingModule._id },
            {
              $set: {
                description: moduleData.description,
                lessons: lessons,
              }
            }
          );
          updated++;
        } else {
          // Create new module
          const newModule = new LearningModule({
            id: moduleData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
            title: moduleData.title,
            description: moduleData.description,
            lessons: lessons,
            createdAt: Date.now(),
            createdByUserId: current,
            visibility: 'global'
          });

          await newModule.save();
          created++;
        }
      }

      res.json({
        success: true,
        message: `Environmental modules processed successfully`,
        stats: { created, updated, total: created + updated }
      });

    } catch (error) {
      console.error('Error importing environmental modules:', error);
      res.status(500).json({ error: 'Failed to import environmental modules' });
    }
  });

  // ===== Activity logging =====
  app.post('/api/student/quiz-attempts', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
  const { quizId, scorePercent, answers } = req.body ?? {};
  const r = await (storage as any).addQuizAttempt(current, { quizId, scorePercent, answers });
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.attempt);
  });
  app.post('/api/student/games/:gameId/play', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const points = Number(req.body?.points);
    const r = await (storage as any).addGamePlay(current, req.params.gameId, Number.isFinite(points) ? points : undefined);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json(r.play);
  });

  // Games: summary for progress UI
  app.get('/api/student/games/summary', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    if (!current) return res.status(401).json({ error: 'Missing username' });
    const summary = await (storage as any).getStudentGameSummary(current);
    res.json(summary);
  });

  // Public: list all games (admin-managed catalog)
  app.get('/api/games', async (_req, res) => {
    const list = await (storage as any).listGames();
    res.json(list);
  });

  // ===== Notifications =====
  app.get('/api/notifications', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const list = await (storage as any).listNotifications(current);
    res.json(list);
  });
  app.post('/api/notifications/read', async (req, res) => {
    const current = (req.headers['x-username'] as string) || '';
    const r = await (storage as any).markAllNotificationsRead(current);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true });
  });

  // ===== Leaderboard =====
  // Global: top schools
  app.get('/api/leaderboard/schools', async (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 25));
    const rows = await (storage as any).getGlobalSchoolsLeaderboard(limit);
    res.json(rows);
  });
  // School: top students
  app.get('/api/leaderboard/school/:schoolId/students', async (req, res) => {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const rows = await (storage as any).getSchoolStudentsLeaderboard(req.params.schoolId, limit, offset);
    res.json(rows);
  });
  // Global: top students (optional school filter)
  app.get('/api/leaderboard/students', async (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const schoolId = (req.query.schoolId as string) || null;
    const rows = await (storage as any).getGlobalStudentsLeaderboard(limit, offset, schoolId);
    res.json(rows);
  });
  // Global: top teachers (optional school filter)
  app.get('/api/leaderboard/teachers', async (req, res) => {
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const schoolId = (req.query.schoolId as string) || null;
    const rows = await (storage as any).getGlobalTeachersLeaderboard(limit, offset, schoolId);
    res.json(rows);
  });
  // School preview
  app.get('/api/leaderboard/school/:schoolId/preview', async (req, res) => {
    const data = await (storage as any).getSchoolPreview(req.params.schoolId);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  });
  // Student preview
  app.get('/api/leaderboard/student/:username/preview', async (req, res) => {
    const data = await (storage as any).getStudentPreview(req.params.username);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  });
  // Teacher preview
  app.get('/api/leaderboard/teacher/:username/preview', async (req, res) => {
    const data = await (storage as any).getTeacherPreview(req.params.username);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  });
  // Admin analytics
  app.get('/api/leaderboard/admin/analytics', async (_req, res) => {
    const data = await (storage as any).getAdminLeaderboardAnalytics();
    res.json(data);
  });

  // Video Management Routes
  
  // Get all videos (public endpoint)
  app.get('/api/videos', async (_req, res) => {
    try {
      const videos = await storage.getAllVideos();
      const categories = [
        'All',
        ...Array.from(new Set(videos.map((video: any) => video.category || 'General'))).filter(Boolean),
      ];
      res.json({ categories, videos });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  });

  // Get user's video progress and credits
  app.get('/api/users/:username/credits', async (req, res) => {
    try {
      const credits = await storage.getUserCredits(req.params.username);
      res.json(credits);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      res.status(500).json({ error: 'Failed to fetch user credits' });
    }
  });

  // Award credits for watching a video
  app.post('/api/videos/watch', async (req, res) => {
    try {
      const current = (req.headers['x-username'] as string) || '';
      const { videoId, username: bodyUsername } = req.body;
      const username = bodyUsername || current;
      const result = await storage.recordVideoWatch(username, videoId);
      res.json(result);
    } catch (error) {
      console.error('Error recording video watch:', error);
      res.status(500).json({ error: 'Failed to record video watch' });
    }
  });

  // Award credits endpoint
  app.post('/api/videos/award-credits', async (req, res) => {
    try {
      const current = (req.headers['x-username'] as string) || '';
      const { username: bodyUsername, videoId } = req.body;
      const username = bodyUsername || current;
      const result = await storage.recordVideoWatch(username, videoId);
      res.json(result);
    } catch (error) {
      console.error('Error awarding credits:', error);
      res.status(500).json({ error: 'Failed to award credits' });
    }
  });

  // Fetch YouTube video metadata
  app.post('/api/videos/youtube-metadata', async (req, res) => {
    try {
      const { url } = req.body;
      const metadata = await storage.fetchYouTubeMetadata(url);
      res.json(metadata);
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      res.status(500).json({ error: 'Failed to fetch YouTube metadata' });
    }
  });

  // Batch fetch YouTube metadata for multiple URLs
  app.post('/api/videos/youtube-metadata-batch', async (req, res) => {
    try {
      const { urls } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.json([]);
      }

      // Deduplicate URLs
      const uniqueUrls = [...new Set(urls)];
      
      // Fetch metadata for all URLs in parallel
      const results = await Promise.all(
        uniqueUrls.map(async (url: string) => {
          try {
            const metadata = await storage.fetchYouTubeMetadata(url);
            return { url, ...metadata };
          } catch (error) {
            console.error(`Error fetching metadata for ${url}:`, error);
            return { url, duration: null, error: 'Failed to fetch metadata' };
          }
        })
      );

      res.json(results);
    } catch (error) {
      console.error('Error fetching YouTube metadata batch:', error);
      res.status(500).json({ error: 'Failed to fetch YouTube metadata batch' });
    }
  });

  // Admin video management routes
  app.post('/api/admin/videos/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    try {
      const current = (req.headers['x-username'] as string) || '';
      if (!current) return res.status(401).json({ error: 'Missing username' });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const videoFile = files?.video?.[0];
      const thumbnailFile = files?.thumbnail?.[0];
      if (!videoFile) return res.status(400).json({ error: 'Video file is required' });

      const title = String(req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const video = await storage.createVideo({
        title,
        description: String(req.body?.description || '').trim() || undefined,
        type: 'file',
        url: `/uploads/${videoFile.filename}`,
        thumbnail: thumbnailFile ? `/uploads/${thumbnailFile.filename}` : undefined,
        credits: Math.max(1, Math.floor(Number(req.body?.credits) || 1)),
        uploadedBy: current,
        category: String(req.body?.category || '').trim() || undefined,
      });

      res.json({ ok: true, video, fileUrl: video.url, thumbnailUrl: video.thumbnail });
    } catch (error) {
      console.error('Error uploading admin video file:', error);
      res.status(500).json({ error: 'Failed to upload video file' });
    }
  });

  app.get('/api/admin/videos', async (_req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error('Error fetching admin videos:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  });

  app.post('/api/admin/videos', async (req, res) => {
    try {
      const { title, description, type, url, thumbnail, credits, category, duration } = req.body;
      const video = await storage.createVideo({
        title,
        description,
        type,
        url,
        thumbnail,
        credits: credits || 1,
        uploadedBy: 'admin', // TODO: Get from authenticated user
        category,
        duration
      });
      res.json(video);
    } catch (error) {
      console.error('Error creating admin video:', error);
      res.status(500).json({ error: 'Failed to create video' });
    }
  });

  app.put('/api/admin/videos/:id', async (req, res) => {
    try {
      const { title, description, type, url, thumbnail, credits, category, duration } = req.body;
      const video = await storage.updateVideo(req.params.id, {
        title,
        description,
        type,
        url,
        thumbnail,
        credits,
        category,
        duration
      });
      res.json(video);
    } catch (error) {
      console.error('Error updating admin video:', error);
      res.status(500).json({ error: 'Failed to update video' });
    }
  });

  app.delete('/api/admin/videos/:id', async (req, res) => {
    try {
      await storage.deleteVideo(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting admin video:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  });

  // Teacher video management routes
  app.post('/api/teacher/videos/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    try {
      const current = (req.headers['x-username'] as string) || '';
      if (!current) return res.status(401).json({ error: 'Missing username' });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const videoFile = files?.video?.[0];
      const thumbnailFile = files?.thumbnail?.[0];
      if (!videoFile) return res.status(400).json({ error: 'Video file is required' });

      const title = String(req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const video = await storage.createVideo({
        title,
        description: String(req.body?.description || '').trim() || undefined,
        type: 'file',
        url: `/uploads/${videoFile.filename}`,
        thumbnail: thumbnailFile ? `/uploads/${thumbnailFile.filename}` : undefined,
        credits: Math.max(1, Math.floor(Number(req.body?.credits) || 1)),
        uploadedBy: current,
        category: String(req.body?.category || '').trim() || undefined,
      });

      res.json({ ok: true, video, fileUrl: video.url, thumbnailUrl: video.thumbnail });
    } catch (error) {
      console.error('Error uploading teacher video file:', error);
      res.status(500).json({ error: 'Failed to upload video file' });
    }
  });

  app.get('/api/teacher/videos', async (req, res) => {
    try {
      const current = (req.headers['x-username'] as string) || '';
      const teacherId = String(req.query.teacherId || current);
      const videos = await storage.getTeacherVideos(teacherId);
      res.json(videos);
    } catch (error) {
      console.error('Error fetching teacher videos:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  });

  app.get('/api/teacher/videos/count', async (req, res) => {
    try {
      const current = (req.headers['x-username'] as string) || '';
      const count = await storage.getTeacherVideosCount(current);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching teacher videos count:', error);
      res.status(500).json({ error: 'Failed to fetch videos count' });
    }
  });

  app.post('/api/teacher/videos', async (req, res) => {
    try {
      const { title, description, type, url, thumbnail, credits, category, duration } = req.body;
      const video = await storage.createVideo({
        title,
        description,
        type,
        url,
        thumbnail,
        credits: credits || 1,
        uploadedBy: req.body.teacherId || 'teacher', // TODO: Get from authenticated user
        category,
        duration
      });
      res.json(video);
    } catch (error) {
      console.error('Error creating teacher video:', error);
      res.status(500).json({ error: 'Failed to create video' });
    }
  });

  app.put('/api/teacher/videos/:id', async (req, res) => {
    try {
      const { title, description, type, url, thumbnail, credits, category, duration, uploadedBy } = req.body;
      const video = await storage.updateVideo(req.params.id, {
        title,
        description,
        type,
        url,
        thumbnail,
        credits,
        category,
        duration,
        uploadedBy
      });
      res.json(video);
    } catch (error) {
      console.error('Error updating teacher video:', error);
      res.status(500).json({ error: 'Failed to update video' });
    }
  });

  app.delete('/api/teacher/videos/:id', async (req, res) => {
    try {
      await storage.deleteVideo(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting teacher video:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  });

  // ===== Public Profile Endpoint (no auth required) =====
  app.get('/api/public-profile/:username', async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    
    try {
      const profile = await (storage as any).getStudentProfile(username);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      
      // Check if student allows external view
      if (!profile.allowExternalView) {
        return res.status(403).json({ error: 'This profile is private' });
      }
      
      // Return public profile data (including eco points)
      res.json({
        username: profile.username,
        name: profile.name,
        ecoPoints: profile.ecoPoints,
        ecoTreeStage: profile.ecoTreeStage,
        achievements: profile.achievements,
        ranks: profile.ranks,
        timeline: profile.timeline,
        schoolId: profile.schoolId
      });
    } catch (error) {
      console.error('Error fetching public profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Email endpoints
  app.post('/api/email/welcome', async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: 'Missing email or name' });
      }
      await sendWelcomeEmail(email, name);
      res.json({ ok: true, message: 'Welcome email sent' });
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  app.post('/api/email/application-status', async (req, res) => {
    try {
      const { email, name, status, message } = req.body;
      if (!email || !name || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      await sendApplicationStatusEmail(email, name, status, message);
      res.json({ ok: true, message: 'Application status email sent' });
    } catch (error: any) {
      console.error('Error sending application status email:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  app.post('/api/email/custom', async (req, res) => {
    try {
      const { to, subject, html, text } = req.body;
      if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Missing required fields (to, subject, html)' });
      }
      await sendEmail({ to, subject, html, text });
      res.json({ ok: true, message: 'Email sent' });
    } catch (error: any) {
      console.error('Error sending custom email:', error);
      res.status(500).json({ error: error.message || 'Failed to send email' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
