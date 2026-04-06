/**
 * Database migration — creates tables on first run, safe to re-run.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../data/db.sqlite");

const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Also ensure uploads dir exists
const uploadsDir = join(__dirname, "../../data/uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const migrations = [
  `CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    semester TEXT NOT NULL,
    year INTEGER NOT NULL,
    instructor TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx', 'txt', 'image', 'youtube', 'webpage')),
    extracted_text TEXT,
    extraction_failed INTEGER NOT NULL DEFAULT 0,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS rubrics (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx', 'txt', 'image', 'youtube', 'webpage')),
    extracted_text TEXT,
    extraction_failed INTEGER NOT NULL DEFAULT 0,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS study_guides (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    model TEXT NOT NULL,
    was_truncated INTEGER NOT NULL DEFAULT 0,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS project_guides (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    model TEXT NOT NULL,
    was_truncated INTEGER NOT NULL DEFAULT 0,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_materials_course_id ON materials(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rubrics_course_id ON rubrics(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_study_guides_course_id ON study_guides(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_project_guides_course_id ON project_guides(course_id)`,

  // Upgrade materials + rubrics to support 'webpage' file type.
  // Recreates the tables only if 'webpage' is not yet in the CHECK constraint.
  () => {
    const matSql = (sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='materials'").get() as { sql: string } | undefined)?.sql ?? "";
    if (matSql.includes("'webpage'")) return;
    sqlite.exec(`ALTER TABLE materials RENAME TO _materials_old`);
    sqlite.exec(`CREATE TABLE materials (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx', 'txt', 'image', 'youtube', 'webpage')),
      extracted_text TEXT,
      extraction_failed INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`);
    sqlite.exec(`INSERT INTO materials SELECT * FROM _materials_old`);
    sqlite.exec(`DROP TABLE _materials_old`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_materials_course_id ON materials(course_id)`);
  },
  () => {
    const rubSql = (sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='rubrics'").get() as { sql: string } | undefined)?.sql ?? "";
    if (rubSql.includes("'webpage'")) return;
    sqlite.exec(`ALTER TABLE rubrics RENAME TO _rubrics_old`);
    sqlite.exec(`CREATE TABLE rubrics (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'docx', 'txt', 'image', 'youtube', 'webpage')),
      extracted_text TEXT,
      extraction_failed INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`);
    sqlite.exec(`INSERT INTO rubrics SELECT * FROM _rubrics_old`);
    sqlite.exec(`DROP TABLE _rubrics_old`);
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_rubrics_course_id ON rubrics(course_id)`);
  },

  `CREATE TABLE IF NOT EXISTS project_sections (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    section_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    rubric_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'drafting', 'complete')),
    draft_content TEXT,
    guidance TEXT,
    material_excerpts TEXT,
    model TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_project_sections_course_id ON project_sections(course_id)`,

  `CREATE TABLE IF NOT EXISTS project_chat_messages (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    section_id TEXT,
    model TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_project_chat_course_id ON project_chat_messages(course_id)`,
];

console.log("Running database migrations...");

for (const migration of migrations) {
  try {
    if (typeof migration === "function") {
      migration();
    } else {
      sqlite.exec(migration);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDuplicateColumn =
      typeof migration === "string" &&
      migration.toLowerCase().includes("alter table") &&
      message.toLowerCase().includes("duplicate column name");
    if (isDuplicateColumn) {
      continue;
    }
    console.error("Migration failed:", message);
    process.exit(1);
  }
}

sqlite.close();
console.log("Database migrations complete.");
