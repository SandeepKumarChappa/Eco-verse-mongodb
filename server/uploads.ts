import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getProjectRoot = () => {
  const cwd = typeof process.cwd === "function" ? process.cwd() : "";
  if (typeof cwd === "string" && cwd.length > 0) return cwd;
  const fallback = path.resolve(__dirname, "..");
  console.warn("process.cwd() unavailable, falling back to project root derived from module path.");
  return fallback;
};

const uploadsDir = path.join(getProjectRoot(), "uploads");

export const getUploadsDir = () => uploadsDir;

export const ensureUploadsDir = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
    return { ok: true as const, uploadsDir };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Uploads directory is unavailable: ${message}`);
    return { ok: false as const, uploadsDir, error };
  }
};