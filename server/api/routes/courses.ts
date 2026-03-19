import { Router } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "../../db/index.js";
import type { ApiOk } from "@shared/types";

export const coursesRouter = Router();

// List all courses with summary counts
coursesRouter.get("/", async (_req, res) => {
  try {
    const courses = await db.select().from(schema.courses).orderBy(schema.courses.createdAt);

    const summaries = await Promise.all(
      courses.map(async (course) => {
        const [materialRows, rubricRows, studyGuide, projectGuide] = await Promise.all([
          db
            .select({ id: schema.materials.id })
            .from(schema.materials)
            .where(eq(schema.materials.courseId, course.id)),
          db
            .select({ id: schema.rubrics.id })
            .from(schema.rubrics)
            .where(eq(schema.rubrics.courseId, course.id)),
          db
            .select({ id: schema.studyGuides.id })
            .from(schema.studyGuides)
            .where(eq(schema.studyGuides.courseId, course.id))
            .get(),
          db
            .select({ id: schema.projectGuides.id })
            .from(schema.projectGuides)
            .where(eq(schema.projectGuides.courseId, course.id))
            .get(),
        ]);
        return {
          ...course,
          materialCount: materialRows.length,
          rubricCount: rubricRows.length,
          hasStudyGuide: !!studyGuide,
          hasProjectGuide: !!projectGuide,
        };
      }),
    );

    const response: ApiOk<typeof summaries> = { ok: true, data: summaries };
    res.json(response);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Get a single course with all related data
coursesRouter.get("/:id", async (req, res) => {
  try {
    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, req.params.id))
      .get();

    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }

    const [materials, rubrics, studyGuide, projectGuide] = await Promise.all([
      db
        .select()
        .from(schema.materials)
        .where(eq(schema.materials.courseId, course.id))
        .orderBy(schema.materials.createdAt),
      db
        .select()
        .from(schema.rubrics)
        .where(eq(schema.rubrics.courseId, course.id))
        .orderBy(schema.rubrics.createdAt),
      db
        .select()
        .from(schema.studyGuides)
        .where(eq(schema.studyGuides.courseId, course.id))
        .get(),
      db
        .select()
        .from(schema.projectGuides)
        .where(eq(schema.projectGuides.courseId, course.id))
        .get(),
    ]);

    const detail = {
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

    res.json({ ok: true, data: detail });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Create a course
coursesRouter.post("/", async (req, res) => {
  try {
    const { name, code, description, semester, year, instructor } = req.body as {
      name: string;
      code: string;
      description?: string;
      semester: string;
      year: number;
      instructor?: string;
    };

    if (!name || !code || !semester || !year) {
      res.status(400).json({ ok: false, error: "name, code, semester, and year are required" });
      return;
    }

    const id = createId();
    await db.insert(schema.courses).values({
      id,
      name,
      code,
      description: description ?? null,
      semester,
      year: Number(year),
      instructor: instructor ?? null,
    });

    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, id))
      .get();

    res.status(201).json({ ok: true, data: course });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Update a course
coursesRouter.put("/:id", async (req, res) => {
  try {
    const { name, code, description, semester, year, instructor } = req.body as {
      name?: string;
      code?: string;
      description?: string;
      semester?: string;
      year?: number;
      instructor?: string;
    };

    await db
      .update(schema.courses)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(semester !== undefined ? { semester } : {}),
        ...(year !== undefined ? { year: Number(year) } : {}),
        ...(instructor !== undefined ? { instructor } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.courses.id, req.params.id));

    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, req.params.id))
      .get();

    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }

    res.json({ ok: true, data: course });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Delete a course (cascades to materials, rubrics, guides)
coursesRouter.delete("/:id", async (req, res) => {
  try {
    await db.delete(schema.courses).where(eq(schema.courses.id, req.params.id));
    res.json({ ok: true, data: null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
