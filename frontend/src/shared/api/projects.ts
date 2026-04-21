import type {
  Project,
  ProjectCreateForLeadPayload,
  ProjectCreatePayload,
  ProjectPriority,
  ProjectStatus,
  ProjectUpdatePayload,
} from "@/entities/project/types";
import { apiRequest } from "@/shared/api/http";

export function fetchProjects(params?: {
  status?: ProjectStatus;
  lead_id?: number;
  is_active?: boolean;
  include_inactive?: boolean;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.lead_id != null) q.set("lead_id", String(params.lead_id));
  if (params?.is_active != null) q.set("is_active", String(params.is_active));
  if (params?.include_inactive) q.set("include_inactive", "true");
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return apiRequest<Project[]>(`/projects${qs ? `?${qs}` : ""}`);
}

export function fetchProjectsActive() {
  return apiRequest<Project[]>(`/projects/active`);
}

export function fetchProjectsOverdue() {
  return apiRequest<Project[]>(`/projects/overdue`);
}

export function fetchProject(id: number) {
  return apiRequest<Project>(`/projects/${id}`);
}

export function createProject(body: ProjectCreatePayload) {
  return apiRequest<Project>("/projects", { method: "POST", json: body });
}

export function createProjectForLead(leadId: number, body: ProjectCreateForLeadPayload) {
  return apiRequest<Project>(`/leads/${leadId}/projects`, { method: "POST", json: body });
}

export function updateProject(id: number, patch: ProjectUpdatePayload) {
  return apiRequest<Project>(`/projects/${id}`, { method: "PATCH", json: patch });
}

export function deleteProject(id: number) {
  return apiRequest<void>(`/projects/${id}`, { method: "DELETE" });
}

export function fetchLeadProjects(leadId: number, include_inactive = false) {
  const q = include_inactive ? "?include_inactive=true" : "";
  return apiRequest<Project[]>(`/leads/${leadId}/projects${q}`);
}

export type { ProjectPriority, ProjectStatus };
