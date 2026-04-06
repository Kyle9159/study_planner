/**
 * API client for the Study Planner backend.
 */

import type {
  AppSettings,
  CourseSummary,
  CourseDetail,
  Course,
  Material,
  Rubric,
  StudyGuide,
  ProjectGuide,
  ProjectSection,
  ProjectChatMessage,
} from "@shared/types";

const API_BASE = "/api";

class ApiClientError extends Error {
  status?: number;
  constructor(message: string, options?: { status?: number }) {
    super(message);
    this.name = "ApiClientError";
    this.status = options?.status;
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: isFormData
      ? (options?.headers ?? {})
      : { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      `Server error (${response.status}): Expected JSON but received unexpected response. Is the backend running?`,
      { status: response.status },
    );
  }

  const result = payload as { ok: boolean; data?: T; error?: string };
  if (!result.ok) {
    throw new ApiClientError(result.error || "Request failed", { status: response.status });
  }
  return result.data as T;
}

// Courses
export const getCourses = () => fetchApi<CourseSummary[]>("/courses");

export const getCourse = (id: string) => fetchApi<CourseDetail>(`/courses/${id}`);

export const createCourse = (data: {
  name: string;
  code: string;
  semester: string;
  year: number;
  description?: string;
  instructor?: string;
}) => fetchApi<Course>("/courses", { method: "POST", body: JSON.stringify(data) });

export const updateCourse = (
  id: string,
  data: Partial<{
    name: string;
    code: string;
    semester: string;
    year: number;
    description: string;
    instructor: string;
  }>,
) => fetchApi<Course>(`/courses/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteCourse = (id: string) =>
  fetchApi<null>(`/courses/${id}`, { method: "DELETE" });

// Materials
export const uploadMaterial = (courseId: string, formData: FormData) =>
  fetchApi<Material>(`/courses/${courseId}/materials`, { method: "POST", body: formData });

export const addYouTubeMaterial = (courseId: string, url: string) =>
  fetchApi<Material>(`/courses/${courseId}/materials`, {
    method: "POST",
    body: JSON.stringify({ url, fileType: "youtube" }),
  });

export const addWebpageMaterial = (courseId: string, url: string) =>
  fetchApi<Material>(`/courses/${courseId}/materials`, {
    method: "POST",
    body: JSON.stringify({ url, fileType: "webpage" }),
  });

export const deleteMaterial = (courseId: string, materialId: string) =>
  fetchApi<null>(`/courses/${courseId}/materials/${materialId}`, { method: "DELETE" });

// Rubrics
export const uploadRubric = (courseId: string, formData: FormData) =>
  fetchApi<Rubric>(`/courses/${courseId}/rubrics`, { method: "POST", body: formData });

export const addYouTubeRubric = (courseId: string, url: string) =>
  fetchApi<Rubric>(`/courses/${courseId}/rubrics`, {
    method: "POST",
    body: JSON.stringify({ url, fileType: "youtube" }),
  });

export const addWebpageRubric = (courseId: string, url: string) =>
  fetchApi<Rubric>(`/courses/${courseId}/rubrics`, {
    method: "POST",
    body: JSON.stringify({ url, fileType: "webpage" }),
  });

export const deleteRubric = (courseId: string, rubricId: string) =>
  fetchApi<null>(`/courses/${courseId}/rubrics/${rubricId}`, { method: "DELETE" });

// AI Generation
export const generateStudyGuide = (courseId: string, model: string, minimalPass = false) =>
  fetchApi<StudyGuide>(`/courses/${courseId}/generate-study-guide`, {
    method: "POST",
    body: JSON.stringify({ model, minimalPass }),
  });

export const generateProjectGuide = (courseId: string, model: string) =>
  fetchApi<ProjectGuide>(`/courses/${courseId}/generate-project-guide`, {
    method: "POST",
    body: JSON.stringify({ model }),
  });

export const generateStudyNotes = (courseId: string, model: string) =>
  fetchApi<StudyGuide>(`/courses/${courseId}/generate-study-notes`, {
    method: "POST",
    body: JSON.stringify({ model }),
  });

export const exportStudyGuideDocx = async (courseId: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE}/courses/${courseId}/study-guide/export-docx`, {
    method: "POST",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Export failed" }));
    throw new Error((err as { error?: string }).error || "Export failed");
  }
  return response.blob();
};

// Settings
export const getSettings = () => fetchApi<AppSettings>("/settings");

export const updateSettings = (data: Partial<AppSettings & { xaiApiKey: string; githubToken: string; anthropicApiKey: string; wguSessionCookie: string }>) =>
  fetchApi<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(data) });

// WGU Section Parser
export const parseWguSections = (courseId: string, url: string) =>
  fetchApi<Material>(`/courses/${courseId}/wgu-parse`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });

// Complete Project
export const parseRubricSections = (courseId: string, model: string, force = false) =>
  fetchApi<ProjectSection[]>(`/courses/${courseId}/project-sections/parse`, {
    method: "POST",
    body: JSON.stringify({ model, force }),
  });

export const getProjectSections = (courseId: string) =>
  fetchApi<ProjectSection[]>(`/courses/${courseId}/project-sections`);

export const generateSectionDraft = (courseId: string, sectionId: string, model: string) =>
  fetchApi<ProjectSection>(`/courses/${courseId}/project-sections/${sectionId}/generate`, {
    method: "POST",
    body: JSON.stringify({ model }),
  });

export const updateSection = (
  courseId: string,
  sectionId: string,
  data: { draftContent?: string; status?: "pending" | "drafting" | "complete" },
) =>
  fetchApi<ProjectSection>(`/courses/${courseId}/project-sections/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const sendChatMessage = (
  courseId: string,
  message: string,
  model: string,
  sectionId?: string,
) =>
  fetchApi<ProjectChatMessage>(`/courses/${courseId}/project-chat`, {
    method: "POST",
    body: JSON.stringify({ message, model, sectionId }),
  });

export const getChatHistory = (courseId: string) =>
  fetchApi<ProjectChatMessage[]>(`/courses/${courseId}/project-chat`);

export const clearChat = (courseId: string) =>
  fetchApi<null>(`/courses/${courseId}/project-chat`, { method: "DELETE" });

export const exportProjectDocument = async (courseId: string, tasks?: string[]): Promise<Blob> => {
  const response = await fetch(`${API_BASE}/courses/${courseId}/project-sections/export`, {
    method: "POST",
    headers: tasks?.length ? { "Content-Type": "application/json" } : {},
    body: tasks?.length ? JSON.stringify({ tasks }) : undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Export failed" }));
    throw new Error((err as { error?: string }).error || "Export failed");
  }
  return response.blob();
};
