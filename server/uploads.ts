import fs from "fs";
import path from "path";

// Always use stable project root
const uploadsDir = path.join(process.cwd(), "uploads");

export const getUploadsDir = () => uploadsDir;

export const ensureUploadsDir = () => {
  try {
    // Create uploads folder if not exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Check read/write permissions
    fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);

    return { ok: true as const, uploadsDir };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.warn(`Uploads directory is unavailable: ${message}`);

    return { ok: false as const, uploadsDir, error };
  }
};