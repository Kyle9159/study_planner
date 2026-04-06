import { Router } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { db, schema } from "../../db/index.js";
import { generateGuide, generateStudyNotes } from "../../services/ai.js";
import type { CourseDetail, StructuredStudyGuide } from "@shared/types";
import { normalizeKeyPoint } from "@shared/types";

export const aiRouter = Router();

export async function loadCourseDetail(courseId: string): Promise<CourseDetail | null> {
  const course = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .get();

  if (!course) return null;

  const materials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.courseId, courseId))
    .orderBy(schema.materials.createdAt);

  const rubrics = await db
    .select()
    .from(schema.rubrics)
    .where(eq(schema.rubrics.courseId, courseId))
    .orderBy(schema.rubrics.createdAt);

  const studyGuide = await db
    .select()
    .from(schema.studyGuides)
    .where(eq(schema.studyGuides.courseId, courseId))
    .get();

  const projectGuide = await db
    .select()
    .from(schema.projectGuides)
    .where(eq(schema.projectGuides.courseId, courseId))
    .get();

  const projectSections = await db
    .select()
    .from(schema.projectSections)
    .where(eq(schema.projectSections.courseId, courseId))
    .orderBy(schema.projectSections.sectionIndex);

  const projectChatMessages = await db
    .select()
    .from(schema.projectChatMessages)
    .where(eq(schema.projectChatMessages.courseId, courseId))
    .orderBy(schema.projectChatMessages.createdAt);

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
    projectSections,
    projectChatMessages,
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

// Generate study notes for existing study guide key points
aiRouter.post("/:id/generate-study-notes", async (req, res) => {
  try {
    const courseId = req.params.id;
    const { model } = req.body as { model?: string };

    let modelId = model;
    if (!modelId) {
      const row = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, "defaultModel"))
        .get();
      modelId = row?.value;
    }
    if (!modelId) {
      res.status(400).json({ ok: false, error: "No model specified" });
      return;
    }

    const course = await loadCourseDetail(courseId);
    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }
    if (!course.studyGuide) {
      res.status(400).json({ ok: false, error: "No study guide exists. Generate one first." });
      return;
    }

    // Parse existing guide content
    const rawContent = course.studyGuide.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const parsed = JSON.parse(rawContent) as StructuredStudyGuide;

    const enriched = await generateStudyNotes(course, parsed, modelId);

    // Update the guide content with enriched version
    const now = new Date().toISOString();
    await db
      .update(schema.studyGuides)
      .set({ content: JSON.stringify(enriched), updatedAt: now })
      .where(eq(schema.studyGuides.courseId, courseId));

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

// Export study guide as Word document
aiRouter.post("/:id/study-guide/export-docx", async (req, res) => {
  try {
    const courseId = req.params.id;

    const course = await db
      .select()
      .from(schema.courses)
      .where(eq(schema.courses.id, courseId))
      .get();
    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }

    const guide = await db
      .select()
      .from(schema.studyGuides)
      .where(eq(schema.studyGuides.courseId, courseId))
      .get();
    if (!guide) {
      res.status(400).json({ ok: false, error: "No study guide to export" });
      return;
    }

    const rawContent = guide.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    let parsed: StructuredStudyGuide;
    try {
      parsed = JSON.parse(rawContent) as StructuredStudyGuide;
    } catch {
      res.status(400).json({ ok: false, error: "Study guide content is not structured JSON" });
      return;
    }

    const children: Paragraph[] = [
      new Paragraph({ text: `Study Guide — ${course.name}`, heading: HeadingLevel.TITLE }),
      new Paragraph({
        children: [
          new TextRun({ text: `${course.code} — ${course.semester} ${course.year}`, italics: true, color: "666666" }),
        ],
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: parsed.overview })],
        spacing: { after: 300 },
      }),
    ];

    for (const subject of parsed.subjects) {
      children.push(
        new Paragraph({ text: `${subject.title} [${subject.priority}]`, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [new TextRun({ text: subject.summary, italics: true })],
          spacing: { after: 200 },
        }),
      );

      for (const kp of subject.keyPoints) {
        const normalized = normalizeKeyPoint(kp);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${normalized.text}`, bold: true })],
            spacing: { after: normalized.notes ? 100 : 200 },
          }),
        );
        if (normalized.notes) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: normalized.notes })],
              indent: { left: 360 },
              spacing: { after: 200 },
            }),
          );
        }
      }

      // Material excerpts
      if (subject.materialExcerpts.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Source References", bold: true, size: 20 })],
            spacing: { before: 200, after: 100 },
          }),
        );
        for (const ex of subject.materialExcerpts) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${ex.sourceName}] `, bold: true, italics: true, size: 18 }),
                new TextRun({ text: ex.excerpt, italics: true, size: 18 }),
              ],
              indent: { left: 360 },
              spacing: { after: 100 },
            }),
          );
        }
      }

      children.push(new Paragraph({ text: "" }));
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    const safeName = course.name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "study-guide";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-study-guide.docx"`);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});
