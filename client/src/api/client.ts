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

export const deleteRubric = (courseId: string, rubricId: string) =>
  fetchApi<null>(`/courses/${courseId}/rubrics/${rubricId}`, { method: "DELETE" });

// AI Generation
export const generateStudyGuide = (courseId: string, model: string) =>
  fetchApi<StudyGuide>(`/courses/${courseId}/generate-study-guide`, {
    method: "POST",
    body: JSON.stringify({ model }),
  });

export const generateProjectGuide = (courseId: string, model: string) =>
  fetchApi<ProjectGuide>(`/courses/${courseId}/generate-project-guide`, {
    method: "POST",
    body: JSON.stringify({ model }),
  });

// Settings
export const getSettings = () => fetchApi<AppSettings>("/settings");

export const updateSettings = (data: Partial<AppSettings & { xaiApiKey: string; githubToken: string }>) =>
  fetchApi<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(data) });
