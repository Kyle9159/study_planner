import { Router } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "../../db/index.js";
import { generateGuide } from "../../services/ai.js";
import type { CourseDetail } from "@shared/types";

export const aiRouter = Router();

async function loadCourseDetail(courseId: string): Promise<CourseDetail | null> {
  const course = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .get();

  if (!course) return null;

  const [materials, rubrics, studyGuide, projectGuide] = await Promise.all([
    db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.courseId, courseId))
      .orderBy(schema.materials.createdAt),
    db
      .select()
      .from(schema.rubrics)
      .where(eq(schema.rubrics.courseId, courseId))
      .orderBy(schema.rubrics.createdAt),
    db
      .select()
      .from(schema.studyGuides)
      .where(eq(schema.studyGuides.courseId, courseId))
      .get(),
    db
      .select()
      .from(schema.projectGuides)
      .where(eq(schema.projectGuides.courseId, courseId))
      .get(),
  ]);

  return {
    ...course,
    materials: materials.map((m) => ({ ...m, extractionFailed: !!m.extractionFailed })),
    rubrics: rubrics.map((r) => ({ ...r, extractionFailed: !!r.extractionFailed })),
    studyGuide: studyGuide
      ? { ...studyGuide, wasTruncated: !!studyGuide.wasTruncated }
      : null,
    projectGuide: projectGuide
      ? { ...projectGuide, wasTruncated: !!projectGuide.wasTruncated }
      : null,
  };
}

aiRouter.post("/:id/generate-study-guide", async (req, res) => {
  try {
    const courseId = req.params.id;
    const { model, minimalPass } = req.body as { model?: string; minimalPass?: boolean };

    // Fall back to default model from settings
    let modelId = model;
    if (!modelId) {
      const defaultModelRow = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, "defaultModel"))
        .get();
      modelId = defaultModelRow?.value;
    }
    if (!modelId) {
      res.status(400).json({ ok: false, error: "No model specified and no default model set" });
      return;
    }

    const course = await loadCourseDetail(courseId);
    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }

    const { content, wasTruncated } = await generateGuide(course, "study", modelId, { minimalPass: minimalPass ?? false });

    // Upsert (replace existing)
    const existing = await db
      .select()
      .from(schema.studyGuides)
      .where(eq(schema.studyGuides.courseId, courseId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schema.studyGuides)
        .set({ content, model: modelId, wasTruncated, updatedAt: now })
        .where(eq(schema.studyGuides.courseId, courseId));
    } else {
      await db.insert(schema.studyGuides).values({
        id: createId(),
        courseId,
        content,
        model: modelId,
        wasTruncated,
        generatedAt: now,
        updatedAt: now,
      });
    }

    const guide = await db
      .select()
      .from(schema.studyGuides)
      .where(eq(schema.studyGuides.courseId, courseId))
      .get();

    res.json({ ok: true, data: guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

aiRouter.post("/:id/generate-project-guide", async (req, res) => {
  try {
    const courseId = req.params.id;
    const { model } = req.body as { model?: string };

    let modelId = model;
    if (!modelId) {
      const defaultModelRow = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, "defaultModel"))
        .get();
      modelId = defaultModelRow?.value;
    }
    if (!modelId) {
      res.status(400).json({ ok: false, error: "No model specified and no default model set" });
      return;
    }

    const course = await loadCourseDetail(courseId);
    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }

    const { content, wasTruncated } = await generateGuide(course, "project", modelId);

    const existing = await db
      .select()
      .from(schema.projectGuides)
      .where(eq(schema.projectGuides.courseId, courseId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schema.projectGuides)
        .set({ content, model: modelId, wasTruncated, updatedAt: now })
        .where(eq(schema.projectGuides.courseId, courseId));
    } else {
      await db.insert(schema.projectGuides).values({
        id: createId(),
        courseId,
        content,
        model: modelId,
        wasTruncated,
        generatedAt: now,
        updatedAt: now,
      });
    }

    const guide = await db
      .select()
      .from(schema.projectGuides)
      .where(eq(schema.projectGuides.courseId, courseId))
      .get();

    res.json({ ok: true, data: guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});
