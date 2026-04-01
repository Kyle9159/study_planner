// ============================================================================
// Shared types between client and server
// ============================================================================

export type FileType = "pdf" | "docx" | "txt" | "image" | "youtube" | "webpage";

export type Provider = "xai" | "github";

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

export type XaiModel = (typeof XAI_MODELS)[number];
export type GithubModel = (typeof GITHUB_MODELS)[number];
export type ModelId = XaiModel | GithubModel;

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
};

export type StudySubject = {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  summary: string;
  keyPoints: string[];
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

export type AppSettings = {
  xaiApiKey: string | null;
  githubToken: string | null;
  defaultModel: string | null;
  wguSessionCookie: string | null;
};

export type CourseDetail = Course & {
  materials: Material[];
  rubrics: Rubric[];
  studyGuide: StudyGuide | null;
  projectGuide: ProjectGuide | null;
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
