import { Router } from "express";
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { Document, HeadingLevel, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, convertInchesToTwip } from "docx";
import { db, schema } from "../../db/index.js";
import {
  parseRubricSections,
  generateSectionDraft,
  chatWithMaterials,
} from "../../services/ai.js";
import { loadCourseDetail } from "./ai.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, "../../../data/generate-debug.log");

function debugLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + "\n"); } catch { /* ignore */ }
}

export const projectRouter = Router();

// Parse rubric into sections
projectRouter.post("/:id/project-sections/parse", async (req, res) => {
  try {
    const courseId = req.params.id;
    const { model, force } = req.body as { model?: string; force?: boolean };

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

    // Check for existing sections
    const existing = await db
      .select()
      .from(schema.projectSections)
      .where(eq(schema.projectSections.courseId, courseId));
    if (existing.length > 0 && !force) {
      res.status(409).json({
        ok: false,
        error: "Sections already exist. Use force: true to re-parse.",
      });
      return;
    }

    const course = await loadCourseDetail(courseId);
    if (!course) {
      res.status(404).json({ ok: false, error: "Course not found" });
      return;
    }
    if (course.rubrics.length === 0) {
      res.status(400).json({ ok: false, error: "No rubric uploaded. Add a rubric first." });
      return;
    }

    // Delete existing sections if force
    if (force && existing.length > 0) {
      await db
        .delete(schema.projectSections)
        .where(eq(schema.projectSections.courseId, courseId));
    }

    const sections = await parseRubricSections(course, modelId);

    // Insert sections
    const now = new Date().toISOString();
    for (let i = 0; i < sections.length; i++) {
      await db.insert(schema.projectSections).values({
        id: createId(),
        courseId,
        sectionIndex: i,
        title: sections[i].title,
        rubricText: sections[i].rubricText,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    const rows = await db
      .select()
      .from(schema.projectSections)
      .where(eq(schema.projectSections.courseId, courseId))
      .orderBy(schema.projectSections.sectionIndex);

    res.status(201).json({ ok: true, data: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// Get all sections
projectRouter.get("/:id/project-sections", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.projectSections)
      .where(eq(schema.projectSections.courseId, req.params.id))
      .orderBy(schema.projectSections.sectionIndex);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Generate draft for a section
projectRouter.post(
  "/:id/project-sections/:sectionId/generate",
  async (req, res) => {
    try {
      const { id: courseId, sectionId } = req.params;
      const { model } = req.body as { model?: string };
      debugLog(`START courseId=${courseId} sectionId=${sectionId} model=${model}`);

      let modelId = model;
      if (!modelId) {
        const row = await db
          .select()
          .from(schema.settings)
          .where(eq(schema.settings.key, "defaultModel"))
          .get();
        modelId = row?.value;
        debugLog(`Default model from settings: ${modelId}`);
      }
      if (!modelId) {
        res.status(400).json({ ok: false, error: "No model specified" });
        return;
      }

      debugLog("Step 1: Fetching section...");
      const section = await db
        .select()
        .from(schema.projectSections)
        .where(eq(schema.projectSections.id, sectionId))
        .get();
      if (!section) {
        res.status(404).json({ ok: false, error: "Section not found" });
        return;
      }
      debugLog(`Step 1 OK: title="${section.title}"`);

      debugLog("Step 2: Loading course detail...");
      const course = await loadCourseDetail(courseId);
      if (!course) {
        res.status(404).json({ ok: false, error: "Course not found" });
        return;
      }
      debugLog(`Step 2 OK: materials=${course.materials.length} rubrics=${course.rubrics.length} sections=${course.projectSections.length}`);

      debugLog("Step 3: Calling AI generateSectionDraft...");
      const result = await generateSectionDraft(
        course,
        { title: section.title, rubricText: section.rubricText },
        modelId,
      );
      debugLog(`Step 3 OK: draft=${result.draftContent.length}chars guidance=${result.guidance.length}chars excerpts=${result.materialExcerpts.length}`);

      debugLog("Step 4: Updating DB...");
      const now = new Date().toISOString();
      // guidance may come back as array from AI — ensure it's a string
      const guidanceStr = Array.isArray(result.guidance)
        ? (result.guidance as string[]).map((g) => `• ${g}`).join("\n")
        : result.guidance;
      await db
        .update(schema.projectSections)
        .set({
          draftContent: result.draftContent,
          guidance: guidanceStr,
          materialExcerpts: JSON.stringify(result.materialExcerpts),
          model: modelId,
          status: "drafting",
          updatedAt: now,
        })
        .where(eq(schema.projectSections.id, sectionId));
      debugLog("Step 4 OK");

      debugLog("Step 5: Re-fetching...");
      const updated = await db
        .select()
        .from(schema.projectSections)
        .where(eq(schema.projectSections.id, sectionId))
        .get();
      debugLog("Step 5 OK — DONE");

      res.json({ ok: true, data: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : "";
      debugLog(`ERROR: ${message}`);
      debugLog(`STACK: ${stack}`);
      res.status(500).json({ ok: false, error: message });
    }
  },
);

// Update section draft / status
projectRouter.put("/:id/project-sections/:sectionId", async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { draftContent, status } = req.body as {
      draftContent?: string;
      status?: "pending" | "drafting" | "complete";
    };

    await db
      .update(schema.projectSections)
      .set({
        ...(draftContent !== undefined ? { draftContent } : {}),
        ...(status !== undefined ? { status } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.projectSections.id, sectionId));

    const updated = await db
      .select()
      .from(schema.projectSections)
      .where(eq(schema.projectSections.id, sectionId))
      .get();

    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Send chat message
projectRouter.post("/:id/project-chat", async (req, res) => {
  try {
    const courseId = req.params.id;
    const { message, model, sectionId } = req.body as {
      message: string;
      model?: string;
      sectionId?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ ok: false, error: "Message required" });
      return;
    }

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

    // Save user message
    const userMsgId = createId();
    await db.insert(schema.projectChatMessages).values({
      id: userMsgId,
      courseId,
      role: "user",
      content: message.trim(),
      sectionId: sectionId ?? null,
      model: null,
    });

    // Load conversation history
    const history = await db
      .select()
      .from(schema.projectChatMessages)
      .where(eq(schema.projectChatMessages.courseId, courseId))
      .orderBy(schema.projectChatMessages.createdAt);

    const messages_ = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Get section context if specified
    let sectionContext: { title: string; rubricText: string } | null = null;
    if (sectionId) {
      const section = await db
        .select()
        .from(schema.projectSections)
        .where(eq(schema.projectSections.id, sectionId))
        .get();
      if (section) {
        sectionContext = { title: section.title, rubricText: section.rubricText };
      }
    }

    const reply = await chatWithMaterials(course, messages_, modelId, sectionContext);

    // Save assistant message
    const assistantMsgId = createId();
    await db.insert(schema.projectChatMessages).values({
      id: assistantMsgId,
      courseId,
      role: "assistant",
      content: reply,
      sectionId: sectionId ?? null,
      model: modelId,
    });

    const assistantMsg = await db
      .select()
      .from(schema.projectChatMessages)
      .where(eq(schema.projectChatMessages.id, assistantMsgId))
      .get();

    res.json({ ok: true, data: assistantMsg });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// Get chat history
projectRouter.get("/:id/project-chat", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.projectChatMessages)
      .where(eq(schema.projectChatMessages.courseId, req.params.id))
      .orderBy(schema.projectChatMessages.createdAt);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Clear chat
projectRouter.delete("/:id/project-chat", async (req, res) => {
  try {
    await db
      .delete(schema.projectChatMessages)
      .where(eq(schema.projectChatMessages.courseId, req.params.id));
    res.json({ ok: true, data: null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Export Word document
projectRouter.post("/:id/project-sections/export", async (req, res) => {
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

    const allSections = await db
      .select()
      .from(schema.projectSections)
      .where(eq(schema.projectSections.courseId, courseId))
      .orderBy(schema.projectSections.sectionIndex);

    if (allSections.length === 0) {
      res.status(400).json({ ok: false, error: "No sections to export" });
      return;
    }

    // Optional task filter — e.g. ["Task 1", "Task 2"]
    const taskFilter: string[] | undefined = req.body?.tasks;
    const sections = taskFilter?.length
      ? allSections.filter((s) => {
          const match = s.title.match(/^(Task\s+\d+)/i);
          return match ? taskFilter.includes(match[1]) : false;
        })
      : allSections;

    if (sections.length === 0) {
      res.status(400).json({ ok: false, error: "No sections match the selected task filter" });
      return;
    }

    const children: Paragraph[] = [];

    // Title page
    children.push(
      new Paragraph({
        text: course.name,
        heading: HeadingLevel.TITLE,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `${course.code} — ${course.semester} ${course.year}`, italics: true, color: "666666", size: 24 }),
        ],
        spacing: { after: 400 },
      }),
    );

    for (const s of sections) {
      // Section heading
      children.push(
        new Paragraph({
          text: s.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
      );

      const content = s.draftContent ?? "[Not yet completed]";
      const paragraphs = parseDraftToDocxParagraphs(content);
      children.push(...paragraphs);
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "ordered-list",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.START,
                style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
              },
            ],
          },
          {
            reference: "bullet-list",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "\u2022",
                alignment: AlignmentType.START,
                style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
              },
            ],
          },
        ],
      },
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: { size: 24, font: "Calibri" },
            paragraph: { spacing: { after: 120, line: 276 } },
          },
        ],
      },
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeName = course.name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "project";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-project.docx"`);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

/**
 * Parse markdown-formatted draft content into docx Paragraph objects.
 * Handles: **bold**, numbered lists, bullet lists, sub-headings, block quotes.
 */
function parseDraftToDocxParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const blocks = content.split("\n");

  let i = 0;
  while (i < blocks.length) {
    const line = blocks[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Sub-heading: **Bold Text** on its own line (entire line is bold)
    const standaloneHeading = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
    if (standaloneHeading && !trimmed.match(/^\d+\.\s/) && !trimmed.startsWith("-") && !trimmed.startsWith("•")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: standaloneHeading[1], bold: true, size: 26 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }),
      );
      i++;
      continue;
    }

    // Numbered list item: "1. text" or "1. **bold:** rest"
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const listContent = numberedMatch[2];
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(listContent),
          numbering: { reference: "ordered-list", level: 0 },
          spacing: { after: 80 },
        }),
      );
      i++;
      // Collect continuation lines (indented or next non-numbered/non-empty)
      while (i < blocks.length) {
        const nextLine = blocks[i];
        const nextTrimmed = nextLine.trim();
        // Stop at empty line, new numbered item, new bullet, or new heading
        if (!nextTrimmed || nextTrimmed.match(/^\d+\.\s/) || nextTrimmed.startsWith("-") || nextTrimmed.startsWith("•") || nextTrimmed.match(/^\*\*.+\*\*\s*$/)) break;
        // This is a continuation paragraph under the list item
        if (nextLine.startsWith("   ") || nextLine.startsWith("\t")) {
          paragraphs.push(
            new Paragraph({
              children: parseInlineFormatting(nextTrimmed),
              indent: { left: convertInchesToTwip(0.5) },
              spacing: { after: 80 },
            }),
          );
          i++;
        } else {
          break;
        }
      }
      continue;
    }

    // Bullet list item: "- text" or "• text"
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(bulletMatch[1]),
          numbering: { reference: "bullet-list", level: 0 },
          spacing: { after: 80 },
        }),
      );
      i++;
      continue;
    }

    // Block quote: "> text"
    const quoteMatch = trimmed.match(/^>\s*(.+)/);
    if (quoteMatch) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: quoteMatch[1], italics: true, color: "555555" })],
          indent: { left: convertInchesToTwip(0.4) },
          border: {
            left: { style: "single" as const, size: 6, color: "CCCCCC", space: 8 },
          },
          spacing: { after: 120 },
        }),
      );
      i++;
      continue;
    }

    // Regular paragraph — may contain inline **bold** and other formatting
    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(trimmed),
        spacing: { after: 160 },
      }),
    );
    i++;
  }

  return paragraphs;
}

/**
 * Parse inline markdown formatting into TextRun objects.
 * Handles: **bold**, *italic*, `code`, and plain text segments.
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Match **bold**, *italic*, `code`, or plain text
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1] !== undefined) {
      // **bold**
      runs.push(new TextRun({ text: match[1], bold: true }));
    } else if (match[2] !== undefined) {
      // *italic*
      runs.push(new TextRun({ text: match[2], italics: true }));
    } else if (match[3] !== undefined) {
      // `code`
      runs.push(new TextRun({ text: match[3], font: "Courier New", size: 20, shading: { fill: "F0F0F0" } }));
    } else if (match[4] !== undefined) {
      // plain text — also handle &apos; entities from AI
      const cleaned = match[4]
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      runs.push(new TextRun({ text: cleaned }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}
