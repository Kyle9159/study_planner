import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "../../db/index.js";
import { extractText } from "../../services/extract.js";
import type { FileType } from "@shared/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "../../../data/uploads");

export const materialsRouter = Router();

function getUploadDir(courseId: string): string {
  const dir = join(UPLOADS_DIR, courseId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, getUploadDir(req.params.id));
  },
  filename: (_req, file, cb) => {
    const safe = `${createId()}-${file.originalname.replace(/[^a-z0-9._\-]/gi, "_")}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

function mimeToFileType(mime: string): FileType {
  if (mime === "application/pdf") return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (mime === "text/plain") return "txt";
  if (mime.startsWith("image/")) return "image";
  return "txt";
}

async function handleFileUpload(
  table: "materials" | "rubrics",
  req: Parameters<multer.RequestHandler>[0],
  res: Parameters<multer.RequestHandler>[1],
) {
  const courseId = req.params.id;
  const file = req.file;

  // YouTube URL path (JSON body)
  if (!file && req.body?.fileType === "youtube") {
    const { url } = req.body as { url: string; fileType: "youtube" };
    if (!url) {
      res.status(400).json({ ok: false, error: "url is required for youtube type" });
      return;
    }

    const id = createId();
    let extractedText: string | null = null;
    let extractionFailed = false;

    try {
      extractedText = await extractText("youtube", null, url);
    } catch {
      extractionFailed = true;
    }

    const row = {
      id,
      courseId,
      filename: url,
      originalName: url,
      filePath: null,
      fileType: "youtube" as FileType,
      extractedText,
      extractionFailed,
      url,
    };

    if (table === "materials") {
      await db.insert(schema.materials).values(row);
      const inserted = await db
        .select()
        .from(schema.materials)
        .where(eq(schema.materials.id, id))
        .get();
      res.status(201).json({ ok: true, data: inserted, extractionFailed });
    } else {
      await db.insert(schema.rubrics).values(row);
      const inserted = await db
        .select()
        .from(schema.rubrics)
        .where(eq(schema.rubrics.id, id))
        .get();
      res.status(201).json({ ok: true, data: inserted, extractionFailed });
    }
    return;
  }

  if (!file) {
    res.status(400).json({ ok: false, error: "No file uploaded" });
    return;
  }

  const fileType = mimeToFileType(file.mimetype);
  const id = createId();
  let extractedText: string | null = null;
  let extractionFailed = false;

  if (fileType !== "image") {
    try {
      extractedText = await extractText(fileType, file.path, null);
    } catch {
      extractionFailed = true;
    }
  }

  const row = {
    id,
    courseId,
    filename: file.filename,
    originalName: file.originalname,
    filePath: file.path,
    fileType,
    extractedText,
    extractionFailed,
    url: null,
  };

  if (table === "materials") {
    await db.insert(schema.materials).values(row);
    const inserted = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.id, id))
      .get();
    res.status(201).json({ ok: true, data: inserted, extractionFailed });
  } else {
    await db.insert(schema.rubrics).values(row);
    const inserted = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.id, id))
      .get();
    res.status(201).json({ ok: true, data: inserted, extractionFailed });
  }
}

// Materials routes
materialsRouter.post("/:id/materials", (req, res, next) => {
  // YouTube URLs come as JSON
  if (req.is("application/json")) {
    handleFileUpload("materials", req, res).catch(next);
    return;
  }
  upload.single("file")(req, res, (err) => {
    if (err) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    handleFileUpload("materials", req, res).catch(next);
  });
});

materialsRouter.delete("/:id/materials/:materialId", async (req, res) => {
  try {
    const material = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.id, req.params.materialId))
      .get();

    if (material?.filePath && existsSync(material.filePath)) {
      try {
        unlinkSync(material.filePath);
      } catch {
        // ignore fs errors
      }
    }

    await db.delete(schema.materials).where(eq(schema.materials.id, req.params.materialId));
    res.json({ ok: true, data: null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Rubrics routes (same pattern)
materialsRouter.post("/:id/rubrics", (req, res, next) => {
  if (req.is("application/json")) {
    handleFileUpload("rubrics", req, res).catch(next);
    return;
  }
  upload.single("file")(req, res, (err) => {
    if (err) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    handleFileUpload("rubrics", req, res).catch(next);
  });
});

materialsRouter.delete("/:id/rubrics/:rubricId", async (req, res) => {
  try {
    const rubric = await db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.id, req.params.rubricId))
      .get();

    if (rubric?.filePath && existsSync(rubric.filePath)) {
      try {
        unlinkSync(rubric.filePath);
      } catch {
        // ignore fs errors
      }
    }

    await db.delete(schema.rubrics).where(eq(schema.rubrics.id, req.params.rubricId));
    res.json({ ok: true, data: null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
