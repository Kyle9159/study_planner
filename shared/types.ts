// ============================================================================
// Shared types between client and server
// ============================================================================

export type FileType = "pdf" | "docx" | "txt" | "image" | "youtube" | "webpage";

export type Provider = "xai" | "github" | "anthropic";

export const XAI_MODELS = [
  "grok-4-1-fast-reasoning",
  "grok-4-1-fast-non-reasoning",
] as const;

export const GITHUB_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "grok-4-1-fast-reasoning",
  "grok-4-1-fast-non-reasoning",
  "grok-code-fast-1",
  "claude-sonnet-4-6",
  "gpt-5.4",
  "gemini-3-1-pro",
] as const;

export const CLAUDE_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-3-5-20241022",
] as const;

export type XaiModel = (typeof XAI_MODELS)[number];
export type GithubModel = (typeof GITHUB_MODELS)[number];
export type ClaudeModel = (typeof CLAUDE_MODELS)[number];
export type ModelId = XaiModel | GithubModel | ClaudeModel;

export type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  semester: string;
  year: number;
  instructor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Material = {
  id: string;
  courseId: string;
  filename: string;
  originalName: string;
  filePath: string | null;
  fileType: FileType;
  extractedText: string | null;
  extractionFailed: boolean;
  url: string | null;
  createdAt: string;
};

export type Rubric = {
  id: string;
  courseId: string;
  filename: string;
  originalName: string;
  filePath: string | null;
  fileType: FileType;
  extractedText: string | null;
  extractionFailed: boolean;
  url: string | null;
  createdAt: string;
};

export type MaterialExcerpt = {
  sourceName: string;
  excerpt: string;
  sourceType?: "study" | "rubric"; // optional — backwards compatible with existing stored guides
};

export type KeyPoint = {
  text: string;
  notes?: string;
};

export function normalizeKeyPoint(kp: string | KeyPoint): KeyPoint {
  return typeof kp === "string" ? { text: kp } : kp;
}

export type StudySubject = {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  summary: string;
  keyPoints: (string | KeyPoint)[];
  materialExcerpts: MaterialExcerpt[];
  searchQueries: string[];
};

export type StructuredStudyGuide = {
  overview: string;
  subjects: StudySubject[];
};

export type StudyGuide = {
  id: string;
  courseId: string;
  content: string;
  model: string;
  wasTruncated: boolean;
  generatedAt: string;
  updatedAt: string;
};

export type ProjectGuide = StudyGuide;

export type ProjectSection = {
  id: string;
  courseId: string;
  sectionIndex: number;
  title: string;
  rubricText: string;
  status: "pending" | "drafting" | "complete";
  draftContent: string | null;
  codeContent: string | null;
  guidance: string | null;
  materialExcerpts: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectChatMessage = {
  id: string;
  courseId: string;
  role: "user" | "assistant";
  content: string;
  sectionId: string | null;
  model: string | null;
  createdAt: string;
};

export type AppSettings = {
  xaiApiKey: string | null;
  githubToken: string | null;
  anthropicApiKey: string | null;
  defaultModel: string | null;
  wguSessionCookie: string | null;
};

export type CourseDetail = Course & {
  materials: Material[];
  rubrics: Rubric[];
  studyGuide: StudyGuide | null;
  projectGuide: ProjectGuide | null;
  projectSections: ProjectSection[];
  projectChatMessages: ProjectChatMessage[];
};

export type CourseSummary = Course & {
  materialCount: number;
  rubricCount: number;
  hasStudyGuide: boolean;
  hasProjectGuide: boolean;
};

// API response shape
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
