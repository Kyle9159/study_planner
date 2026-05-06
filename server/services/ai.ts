/**
 * AI generation service via gab.ai OpenAI-compatible API.
 */

import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { CourseDetail, StructuredStudyGuide, KeyPoint } from "@shared/types";
import { truncateText, cleanExtractedText } from "./extract.js";

const GAB_BASE_URL = "https://gab.ai/v1";

const MAX_CHARS_PER_FILE = 30_000;
const MAX_MATERIAL_CHARS = 150_000;
const MAX_RUBRIC_CHARS   = 80_000;

/**
 * Parse JSON, or attempt to repair truncated JSON from AI responses that were
 * cut off mid-stream due to max_tokens. Closes unclosed strings, arrays, objects.
 */
function parseOrRepairJson<T>(raw: string, requiredKey: string): T | null {
  // Try direct parse first
  try {
    const candidate = JSON.parse(raw) as T;
    if (candidate && typeof candidate === "object" && requiredKey in candidate) {
      return candidate;
    }
  } catch {
    // fall through to repair
  }

  let str = raw.trim();
  if (!str.startsWith("{") || !str.includes(`"${requiredKey}"`)) return null;

  let inString = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\\" && inString) { i++; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (inString) str += '"';
  str = str.replace(/,\s*$/, "");
  while (stack.length > 0) str += stack.pop();

  try {
    const candidate = JSON.parse(str) as T;
    if (candidate && typeof candidate === "object" && requiredKey in candidate) {
      return candidate;
    }
  } catch {
    // repair wasn't enough
  }
  return null;
}

async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get();
  return row?.value ?? null;
}

async function getAiClient(): Promise<OpenAI> {
  const apiKey = await getSetting("gabApiKey");
  if (!apiKey) throw new Error("Gab API key not configured. Add it in Settings.");
  return new OpenAI({ apiKey, baseURL: GAB_BASE_URL });
}

/**
 * Unified completion helper using gab.ai OpenAI-compatible API.
 */
async function callCompletion(opts: {
  modelId: string;
  systemPrompt: string;
  userMessage: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const { modelId, systemPrompt, temperature = 0.3, timeoutMs = 300_000 } = opts;
  const client = await getAiClient();

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (opts.messages) {
    for (const m of opts.messages) {
      chatMessages.push({ role: m.role, content: m.content });
    }
  } else {
    chatMessages.push({ role: "user", content: opts.userMessage });
  }

  const MAX_RETRIES = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create(
        {
          model: modelId,
          messages: chatMessages,
          temperature,
        },
        { signal: AbortSignal.timeout(timeoutMs) },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("AI returned an empty response. Please try again.");
      return content;
    } catch (err) {
      lastError = err;
      const isConnectionError = err instanceof OpenAI.APIConnectionError;
      const isRateLimit = err instanceof OpenAI.RateLimitError;
      const isServiceUnavailable = err instanceof OpenAI.APIError && (err.status === 503 || err.status === 529);
      const isRetryable = isConnectionError || isRateLimit || isServiceUnavailable;
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      const delay = 2000 * 2 ** attempt; // 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function buildMaterialsContext(
  items: CourseDetail["materials"] | CourseDetail["rubrics"],
  label: string,
): { text: string; wasTruncated: boolean } {
  let wasTruncated = false;
  const sections = items.map((item) => {
    const rawText = item.extractedText ?? "[No text extracted — image or extraction failed]";
    const cleaned = cleanExtractedText(rawText);
    const truncated = truncateText(cleaned, MAX_CHARS_PER_FILE);
    if (truncated !== cleaned) wasTruncated = true;
    return `### ${item.originalName}\n${truncated}`;
  });
  return { text: `## ${label} (${items.length} file${items.length !== 1 ? "s" : ""})\n${sections.join("\n\n")}`, wasTruncated };
}

export async function generateGuide(
  course: CourseDetail,
  guideType: "study" | "project",
  modelId: string,
  options?: { minimalPass?: boolean },
): Promise<{ content: string; wasTruncated: boolean }> {

  const { text: materialsText, wasTruncated: materialsTruncated } =
    buildMaterialsContext(course.materials, "Study Materials");
  const { text: rubricsText, wasTruncated: rubricsTruncated } =
    buildMaterialsContext(course.rubrics, "Rubric / Project Instructions");

  const cappedMaterials = truncateText(materialsText, MAX_MATERIAL_CHARS);
  const cappedRubrics   = truncateText(rubricsText,   MAX_RUBRIC_CHARS);
  const wasTruncated = materialsTruncated || rubricsTruncated
    || materialsText.length > MAX_MATERIAL_CHARS
    || rubricsText.length > MAX_RUBRIC_CHARS;

  const combinedText = `${cappedMaterials}\n\n${cappedRubrics}`;

  const systemPrompt =
    guideType === "study"
      ? `You are an academic study assistant for a Masters student.
Analyze the course materials and project rubric/instructions, then return a structured JSON study guide.
Return ONLY valid JSON — no markdown code fences, no explanations outside the JSON.

Use this exact schema:
{
  "overview": "2-3 sentence summary of the key focus areas and what this guide covers",
  "subjects": [
    {
      "id": "subject-1",
      "title": "Subject or Topic Name",
      "priority": "High",
      "summary": "1-2 sentences on why this matters and how it ties to the rubric/grading",
      "keyPoints": ["Specific thing to know or do", "Another actionable point"],
      "materialExcerpts": [
        {
          "sourceName": "exact filename as shown in the prompt headings",
          "excerpt": "1-3 sentence verbatim or paraphrased excerpt from the provided text",
          "sourceType": "study"
        },
        {
          "sourceName": "rubric filename",
          "excerpt": "relevant rubric criterion or grading instruction",
          "sourceType": "rubric"
        }
      ],
      "searchQueries": ["precise search query for finding study material", "another query"]
    }
  ]
}

Rules:
- priority "High" = directly tested or graded by rubric; "Medium" = supporting knowledge; "Low" = background context
- Order subjects by priority descending (High first)
- materialExcerpts: for each subject include excerpts from BOTH sections:
  • 1-2 excerpts from the "## Study Materials" section with sourceType "study" — pull actual relevant text from those files
  • 1-2 excerpts from the "## Rubric / Project Instructions" section with sourceType "rubric" — pull the rubric criterion or grading requirement that maps to this subject
  • use [] only if truly no relevant content exists — NEVER omit the field
- searchQueries: 2-3 specific, useful queries a student would use to find study resources online; always include at least 1 — NEVER omit the field
- keyPoints: 3-6 actionable, specific, exam-ready points per subject — NEVER omit the field
- Use the rubric criteria to determine what is High priority${options?.minimalPass ? "\n\nFocus only on minimal competent (B-level) mastery — prioritize exactly what the rubric requires to pass, skip nice-to-haves and advanced topics." : ""}`
      : `You are an academic project coach for a Masters student.
Given the course materials and project rubric/instructions, generate a detailed step-by-step guide for completing the final project.

IMPORTANT: If the rubric contains multiple distinct tasks (e.g. Task 1, Task 2), generate a SEPARATE guide for each task.

Return ONLY valid JSON — no markdown code fences, no explanations outside the JSON:
{
  "tasks": [
    {
      "label": "Task 1: Short Title",
      "guide": "Full markdown guide for this task including:\\n- How to structure and approach the work\\n- What rubric criteria to address\\n- Specific tips and common pitfalls to avoid\\n- A suggested order of completion\\nUse clear headers and numbered steps."
    }
  ]
}

Rules:
- If there is only one task or no explicit task numbering, return a single entry with label "Project Guide"
- Each task's guide should be self-contained markdown with headers and numbered steps
- Reference specific rubric criteria for each task
- Include common pitfalls and tips specific to each task
- Order tasks in logical completion order`;

  const userMessage = `## Course: ${course.name} (${course.code})
## Semester: ${course.semester} ${course.year}${course.instructor ? `\n## Instructor: ${course.instructor}` : ""}${course.description ? `\n## Description: ${course.description}` : ""}

---

${combinedText}`;

  let content = await callCompletion({
    modelId,
    systemPrompt,
    userMessage,
    temperature: 0.3,
  });
  if (!content) throw new Error("AI returned an empty response. Please try again.");

  // Strip markdown code fences from JSON responses (project guide returns JSON)
  if (guideType === "project") {
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }

  return { content, wasTruncated };
}

export async function parseRubricSections(
  course: CourseDetail,
  modelId: string,
): Promise<Array<{ title: string; rubricText: string }>> {

  const { text: rubricsText } = buildMaterialsContext(
    course.rubrics,
    "Rubric / Project Instructions",
  );

  const systemPrompt = `You are an academic assistant. Analyze the project rubric/instructions and identify each discrete task or requirement the student must complete.

Return ONLY valid JSON — no markdown code fences, no explanations:
{
  "sections": [
    {
      "title": "Short descriptive title (e.g., 'Task 1: Executive Summary')",
      "rubricText": "The full rubric text for this requirement, including grading criteria"
    }
  ]
}

Rules:
- Identify ALL distinct tasks/sections/requirements from the rubric
- Each section should be a self-contained deliverable or requirement
- Preserve the original rubric language in rubricText
- Order sections in the logical completion order
- If the rubric has explicit task numbers (Task 1, Task 2...), use those
- Include grading criteria (Competent, Approaching Competent, etc.) if present`;

  const raw = await callCompletion({
    modelId,
    systemPrompt,
    userMessage: rubricsText,
    temperature: 0.2,
  });
  if (!raw) throw new Error("AI returned an empty response.");

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as { sections: Array<{ title: string; rubricText: string }> };

  if (!parsed.sections?.length) {
    throw new Error("AI could not identify any rubric sections. Check your rubric upload.");
  }

  return parsed.sections;
}

export async function generateSectionDraft(
  course: CourseDetail,
  section: { title: string; rubricText: string },
  modelId: string,
): Promise<{ draftContent: string; guidance: string; materialExcerpts: Array<{ sourceName: string; excerpt: string }>; wasTruncated: boolean }> {

  const { text: materialsText, wasTruncated: mt } = buildMaterialsContext(course.materials, "Study Materials");
  const { text: rubricsText, wasTruncated: rt } = buildMaterialsContext(course.rubrics, "Rubric / Project Instructions");
  const cappedMaterials = truncateText(materialsText, MAX_MATERIAL_CHARS);
  const cappedRubrics = truncateText(rubricsText, MAX_RUBRIC_CHARS);
  const wasTruncated = mt || rt || materialsText.length > MAX_MATERIAL_CHARS || rubricsText.length > MAX_RUBRIC_CHARS;

  const systemPrompt = `You are an academic project coach for a Masters student. The student needs to complete a specific rubric requirement for their project.

Using the provided course materials, write a comprehensive draft response that directly addresses the rubric requirement. Also provide actionable guidance and cite relevant source material.

Return ONLY valid JSON — no markdown code fences:
{
  "draftContent": "The full draft text addressing this rubric requirement. Use markdown formatting: headings (##, ###), bold (**term**), bullet/numbered lists, code blocks (\`\`\`), and inline code (\`) where appropriate. Write it as if the student is submitting it. Use proper academic tone. Be thorough and specific, referencing concepts from the course materials.",
  "guidance": "2-4 bullet points of practical tips: what to emphasize, common pitfalls to avoid, how to strengthen the response.",
  "materialExcerpts": [
    {
      "sourceName": "exact filename from the materials",
      "excerpt": "relevant excerpt that supports this section"
    }
  ]
}

Rules:
- draftContent should be substantive (300-800 words) and directly address the rubric criteria
- Use markdown formatting in draftContent: section headings, bold key terms, bullet/numbered lists for multi-part answers, code blocks for any code or config examples
- Reference specific concepts, definitions, and examples from the course materials
- guidance should be actionable and specific to this requirement
- Include 2-4 material excerpts that are most relevant`;

  const userMessage = `## Rubric Requirement: ${section.title}

${section.rubricText}

---

${cappedMaterials}

${cappedRubrics}`;

  const raw = await callCompletion({
    modelId,
    systemPrompt,
    userMessage,
    temperature: 0.3,
  });
  if (!raw) throw new Error("AI returned an empty response.");

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as {
    draftContent: string;
    guidance: string | string[];
    materialExcerpts: Array<{ sourceName: string; excerpt: string }>;
  };

  // AI sometimes returns guidance as an array of bullet points — normalize to string
  const guidance = Array.isArray(parsed.guidance)
    ? parsed.guidance.map((g) => `• ${g}`).join("\n")
    : parsed.guidance;

  return { draftContent: parsed.draftContent, guidance, materialExcerpts: parsed.materialExcerpts, wasTruncated };
}

export async function chatWithMaterials(
  course: CourseDetail,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  modelId: string,
  sectionContext?: { title: string; rubricText: string } | null,
): Promise<string> {
  const { text: materialsText } = buildMaterialsContext(course.materials, "Study Materials");
  const { text: rubricsText } = buildMaterialsContext(course.rubrics, "Rubric / Project Instructions");
  const cappedMaterials = truncateText(materialsText, MAX_MATERIAL_CHARS);
  const cappedRubrics = truncateText(rubricsText, MAX_RUBRIC_CHARS);

  let systemPrompt = `You are an academic project assistant for a Masters student working on their course project for ${course.name} (${course.code}).

You have access to their course materials and rubric. Answer questions helpfully, grounding your responses in the provided materials. Cite specific sources when relevant. Use markdown formatting.

${cappedMaterials}

${cappedRubrics}`;

  if (sectionContext) {
    systemPrompt += `\n\n---\n\nThe student is currently working on: **${sectionContext.title}**\nRubric requirement:\n${sectionContext.rubricText}`;
  }

  // Cap conversation history to last 20 messages
  const recentMessages = messages.slice(-20);

  const content = await callCompletion({
    modelId,
    systemPrompt,
    userMessage: "",
    messages: recentMessages,
    temperature: 0.4,
  });
  if (!content) throw new Error("AI returned an empty response.");
  return content;
}

export type AvailableGabModel = {
  id: string;
  name: string;
};

function titleCaseFromId(value: string): string {
  return value
    .split(/[-_./]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export async function listAvailableGabModels(): Promise<AvailableGabModel[]> {
  const client = await getAiClient();
  const response = await client.models.list();

  const seen = new Set<string>();
  const models: AvailableGabModel[] = [];

  for (const model of response.data ?? []) {
    if (!model?.id || seen.has(model.id)) continue;
    seen.add(model.id);
    models.push({
      id: model.id,
      name: titleCaseFromId(model.id),
    });
  }

  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

export async function generateStudyNotes(
  course: CourseDetail,
  guide: StructuredStudyGuide,
  modelId: string,
): Promise<StructuredStudyGuide> {

  const { text: materialsText } = buildMaterialsContext(course.materials, "Study Materials");
  const { text: rubricsText } = buildMaterialsContext(course.rubrics, "Rubric / Project Instructions");
  const cappedMaterials = truncateText(materialsText, MAX_MATERIAL_CHARS);
  const cappedRubrics = truncateText(rubricsText, MAX_RUBRIC_CHARS);

  const systemPrompt = `You are an academic study assistant for a Masters student. You are given a study guide outline and all the course materials. Your task is to write detailed study notes for every key point in the guide.

For each subject and each key point, write detailed study notes (100-500 words) using information from the course materials. Use a mix of formats for readability:
- Start with a brief introductory sentence or two explaining the concept
- Follow with bullet points for key facts, definitions, formulas, or steps
- Use sub-bullets for examples or elaboration where helpful
- End with a summary sentence connecting back to the rubric/assessment if relevant

Scale the length to match importance: High-priority topics with dense material should use the full 300-500 word range, while simpler points can stay at 100-200 words. Include specific facts, definitions, examples, and connections to the rubric. Write in a concise, note-taking style that a student can review before an exam.

Return ONLY valid JSON — no markdown code fences, no explanations outside the JSON. Use \\n for newlines within notes strings.

Use this exact schema:
{
  "subjects": [
    {
      "id": "subject-1",
      "keyPoints": [
        { "text": "original key point text (keep exactly as-is)", "notes": "Intro sentence.\\n\\n- Bullet point 1\\n- Bullet point 2\\n  - Sub-bullet\\n\\nSummary sentence." }
      ]
    }
  ]
}

Rules:
- You MUST return notes for EVERY subject and EVERY key point provided — do not skip any
- Keep each "text" field EXACTLY as provided in the outline — do not rephrase
- Write notes grounded in the actual course materials provided below — do not make up information
- Each notes section should be self-contained and useful as a standalone study reference
- Use specific terminology, definitions, and examples from the materials
- Format notes as a mix of prose and bullet points — not walls of text
- If materials do not contain relevant information for a key point, write a brief note stating what to focus on based on the rubric requirements`;

  // ── Batch subjects to avoid exceeding token limits ──────────────────────
  // Each key point generates 100-500 words of notes (~200-1000 tokens).
  // We batch by key-point count so each call stays within output limits.
  const BATCH_KEY_POINT_LIMIT = 25;

  type NoteBatch = Array<{
    id: string;
    keyPoints: Array<{ text: string; notes: string }>;
  }>;

  const batches: Array<typeof guide.subjects> = [];
  let currentBatch: typeof guide.subjects = [];
  let currentKpCount = 0;

  for (const subject of guide.subjects) {
    const kpCount = subject.keyPoints.length;
    if (currentBatch.length > 0 && currentKpCount + kpCount > BATCH_KEY_POINT_LIMIT) {
      batches.push(currentBatch);
      currentBatch = [];
      currentKpCount = 0;
    }
    currentBatch.push(subject);
    currentKpCount += kpCount;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  // Run each batch sequentially to avoid rate limits
  const allNotes: NoteBatch = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchOutline = batch.map((s) => ({
      id: s.id,
      title: s.title,
      keyPoints: s.keyPoints.map((kp) =>
        typeof kp === "string" ? kp : kp.text,
      ),
    }));

    const batchLabel = batches.length > 1
      ? `\n\nThis is batch ${i + 1} of ${batches.length}. Write notes for ALL ${batchOutline.length} subject(s) below — do not skip any.`
      : "";

    const userMessage = `## Study Guide Outline${batchLabel}
${JSON.stringify(batchOutline, null, 2)}

---

${cappedMaterials}

${cappedRubrics}`;

    const raw = await callCompletion({
      modelId,
      systemPrompt,
      userMessage,
      temperature: 0.3,
      timeoutMs: 600_000,
    });
    if (!raw) throw new Error(`AI returned an empty response for notes batch ${i + 1}.`);

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = parseOrRepairJson<{ subjects: NoteBatch }>(cleaned, "subjects");
    if (!parsed) throw new Error(`AI returned malformed JSON for study notes (batch ${i + 1} of ${batches.length}). Try regenerating.`);
    allNotes.push(...parsed.subjects);
  }

  // Merge notes into the original guide structure
  const notesMap = new Map<string, Array<{ text: string; notes: string }>>();
  for (const s of allNotes) {
    notesMap.set(s.id, s.keyPoints);
  }

  const enrichedSubjects = guide.subjects.map((subject) => {
    const aiKeyPoints = notesMap.get(subject.id);
    if (!aiKeyPoints) return subject;

    const enrichedKeyPoints: KeyPoint[] = subject.keyPoints.map((kp, idx) => {
      const text = typeof kp === "string" ? kp : kp.text;
      const aiKp = aiKeyPoints[idx] ?? aiKeyPoints.find((ak) => ak.text === text);
      return { text, notes: aiKp?.notes };
    });

    return { ...subject, keyPoints: enrichedKeyPoints };
  });

  return { overview: guide.overview, subjects: enrichedSubjects };
}
