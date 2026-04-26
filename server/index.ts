import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureUploadsDir } from "./uploads";
import { connectToMongoDB } from "./mongodb";

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.PORT = process.env.PORT || "5000";
process.env.HOST = process.env.HOST || "0.0.0.0";

ensureUploadsDir();

const app = express(); // express app
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(morgan("combined"));

// Increase body size limits for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

(async () => {
  // Connect to MongoDB
  await connectToMongoDB();

  // Ensure SQLite tables exist
  const { initDb } = await import('./db');
  initDb();
  // Seed default admin account
  const { DbStorage } = await import('./db-storage');
  const dbStorage = new DbStorage();
  await dbStorage.seedAdmin();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
    // Seed sample tasks for test_teacher if present and no tasks yet
    try {
      const { storage } = await import('./storage');
      const teacher = 'test_teacher';
      const tasks = await (storage as any).listTeacherTasks(teacher);
      if (!Array.isArray(tasks) || tasks.length === 0) {
        await (storage as any).createTask(teacher, { title: 'Recycle Drive', description: 'Collect and sort recyclables.', maxPoints: 8, proofType: 'photo', groupMode: 'group', maxGroupSize: 4 });
        await (storage as any).createTask(teacher, { title: 'Plant a Tree', description: 'Plant a sapling in your neighborhood.', maxPoints: 10, proofType: 'photo', groupMode: 'solo' });
      }
    } catch {}
  } else {
    serveStatic(app);
  }

// Serve the app on the port specified in the environment variable PORT.
// Default host is 127.0.0.1 for local development.
const parsedPort = Number.parseInt(process.env.PORT || '5000', 10);
const port = Number.isFinite(parsedPort) ? parsedPort : 5000;

// Set HOST=0.0.0.0 only when you explicitly want external access.
const host = process.env.HOST || '127.0.0.1';

server.listen(
  {
    port,
    host,
  },
  () => {
    log(`✅ Server running at http://${host}:${port} (PORT=${port})`);
  }
);
})();

  // Sync schools from memory to MongoDB for consistent schoolIds
  try {
    const { storage } = await import('./storage');
    await (storage as any).initializeSyncSchoolsToMongo();
  } catch (err) {
    console.error("⚠️ Error syncing schools:", err);
  }
