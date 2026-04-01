import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  semester: text("semester").notNull(),
  year: integer("year").notNull(),
  instructor: text("instructor"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const materials = sqliteTable("materials", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path"),
  fileType: text("file_type", {
    enum: ["pdf", "docx", "txt", "image", "youtube", "webpage"],
  }).notNull(),
  extractedText: text("extracted_text"),
  extractionFailed: integer("extraction_failed", { mode: "boolean" })
    .notNull()
    .default(false),
  url: text("url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const rubrics = sqliteTable("rubrics", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path"),
  fileType: text("file_type", {
    enum: ["pdf", "docx", "txt", "image", "youtube", "webpage"],
  }).notNull(),
  extractedText: text("extracted_text"),
  extractionFailed: integer("extraction_failed", { mode: "boolean" })
    .notNull()
    .default(false),
  url: text("url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const studyGuides = sqliteTable("study_guides", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .unique()
    .references(() => courses.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  model: text("model").notNull(),
  wasTruncated: integer("was_truncated", { mode: "boolean" })
    .notNull()
    .default(false),
  generatedAt: text("generated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const projectGuides = sqliteTable("project_guides", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .unique()
    .references(() => courses.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  model: text("model").notNull(),
  wasTruncated: integer("was_truncated", { mode: "boolean" })
    .notNull()
    .default(false),
  generatedAt: text("generated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type Rubric = typeof rubrics.$inferSelect;
export type NewRubric = typeof rubrics.$inferInsert;
export type StudyGuide = typeof studyGuides.$inferSelect;
export type ProjectGuide = typeof projectGuides.$inferSelect;
export type Setting = typeof settings.$inferSelect;
