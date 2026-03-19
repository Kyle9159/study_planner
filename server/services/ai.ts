/**
 * AI generation service — xAI and GitHub Models via OpenAI-compatible API.
 */

import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { CourseDetail } from "@shared/types";
import { truncateText } from "./extract.js";

const XAI_BASE_URL = "https://api.x.ai/v1";
const GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com";

const XAI_MODEL_IDS = new Set([
  "grok-4-1-fast-reasoning",
  "grok-4-1-fast-non-reasoning",
]);

const MAX_CHARS_PER_FILE = 8_000;
const MAX_TOTAL_CHARS = 60_000;

async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key))
    .get();
  return row?.value ?? null;
}

function getProvider(modelId: string): "xai" | "github" {
  return XAI_MODEL_IDS.has(modelId) ? "xai" : "github";
}

async function getAiClient(modelId: string): Promise<OpenAI> {
  const provider = getProvider(modelId);

  if (provider === "xai") {
    const apiKey = await getSetting("xaiApiKey");
    if (!apiKey) throw new Error("xAI API key not configured. Add it in Settings.");
    return new OpenAI({ apiKey, baseURL: XAI_BASE_URL });
  } else {
    const token = await getSetting("githubToken");
    if (!token) throw new Error("GitHub token not configured. Add it in Settings.");
    return new OpenAI({ apiKey: token, baseURL: GITHUB_MODELS_BASE_URL });
  }
}

function buildMaterialsContext(
  items: CourseDetail["materials"] | CourseDetail["rubrics"],
  label: string,
): { text: string; wasTruncated: boolean } {
  let wasTruncated = false;
  const sections = items.map((item) => {
    const rawText = item.extractedText ?? "[No text extracted — image or extraction failed]";
    const truncated = truncateText(rawText, MAX_CHARS_PER_FILE);
    if (truncated !== rawText) wasTruncated = true;
    return `### ${item.originalName}\n${truncated}`;
  });
  return { text: `## ${label} (${items.length} file${items.length !== 1 ? "s" : ""})\n${sections.join("\n\n")}`, wasTruncated };
}

export async function generateGuide(
  course: CourseDetail,
  guideType: "study" | "project",
  modelId: string,
): Promise<{ content: string; wasTruncated: boolean }> {
  const client = await getAiClient(modelId);

  const { text: materialsText, wasTruncated: materialsTruncated } =
    buildMaterialsContext(course.materials, "Study Materials");
  const { text: rubricsText, wasTruncated: rubricsTruncated } =
    buildMaterialsContext(course.rubrics, "Rubric / Project Instructions");

  let combinedText = `${materialsText}\n\n${rubricsText}`;
  let wasTruncated = materialsTruncated || rubricsTruncated;

  if (combinedText.length > MAX_TOTAL_CHARS) {
    combinedText = truncateText(combinedText, MAX_TOTAL_CHARS);
    wasTruncated = true;
  }

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
          "sourceName": "exact filename from the materials",
          "excerpt": "1-3 sentence verbatim or paraphrased excerpt from the provided text"
        }
      ],
      "searchQueries": ["precise search query for finding study material", "another query"]
    }
  ]
}

Rules:
- priority "High" = directly tested or graded by rubric; "Medium" = supporting knowledge; "Low" = background context
- Order subjects by priority descending (High first)
- materialExcerpts: pull actual relevant text from the uploaded materials in the prompt; include up to 2 per subject; omit the array entry if no relevant excerpt exists
- searchQueries: 2-3 specific, useful queries a student would use to find study resources online
- keyPoints: 3-6 actionable, specific, exam-ready points per subject
- Use the rubric criteria to determine what is High priority`
      : `You are an academic project coach for a Masters student.
Given the course materials and project rubric/instructions, generate a detailed step-by-step guide
for completing the final project. Include:
- How to structure and approach the work
- What rubric criteria to address in each section
- Specific tips and common pitfalls to avoid
- A suggested timeline/order of completion
Format your response using markdown with clear headers and numbered steps.`;

  const userMessage = `## Course: ${course.name} (${course.code})
## Semester: ${course.semester} ${course.year}${course.instructor ? `\n## Instructor: ${course.instructor}` : ""}${course.description ? `\n## Description: ${course.description}` : ""}

---

${combinedText}`;

  const completion = await client.chat.completions.create(
    {
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    },
    {
      signal: AbortSignal.timeout(120_000),
    },
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response. Please try again.");

  return { content, wasTruncated };
}
