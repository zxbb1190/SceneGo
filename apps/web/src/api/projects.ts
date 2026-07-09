import type {
  CreateLearningProjectInput,
  ImportProjectSubtitlesInput,
  LearningProjectSummary,
  SubtitleLine,
  UpdateLearningProjectInput
} from "@scenego/shared";
import { apiRequest } from "./http.js";

export interface ProjectListResponse {
  projects: LearningProjectSummary[];
}

export interface ProjectDetailResponse {
  project: LearningProjectSummary;
  subtitleLines: SubtitleLine[];
}

export function listProjects(token: string) {
  return apiRequest<ProjectListResponse>("/api/v1/projects", { token });
}

export function createProject(token: string, input: CreateLearningProjectInput) {
  return apiRequest<{ project: LearningProjectSummary }>("/api/v1/projects", {
    method: "POST",
    token,
    json: input
  });
}

export function getProject(token: string, projectId: string) {
  return apiRequest<ProjectDetailResponse>(`/api/v1/projects/${projectId}`, { token });
}

export function deleteProject(token: string, projectId: string) {
  return apiRequest<void>(`/api/v1/projects/${projectId}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });
}

export function updateProject(token: string, projectId: string, input: UpdateLearningProjectInput) {
  return apiRequest<{ project: LearningProjectSummary }>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    token,
    json: input
  });
}

export function updateProjectProgress(
  token: string,
  projectId: string,
  lastPosition: number,
  duration?: number | null
) {
  return apiRequest<{ project: LearningProjectSummary }>(`/api/v1/projects/${projectId}/progress`, {
    method: "PATCH",
    token,
    json: { lastPosition, duration }
  });
}

export function importProjectSubtitles(
  token: string,
  projectId: string,
  input: ImportProjectSubtitlesInput
) {
  return apiRequest<ProjectDetailResponse>(`/api/v1/projects/${projectId}/subtitles`, {
    method: "POST",
    token,
    json: input
  });
}
