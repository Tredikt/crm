import type { Interaction, InteractionType } from "@/entities/interaction/types";
import type {
  Lead,
  LeadCreatePayload,
  LeadStatus,
  LeadUpdatePayload,
} from "@/entities/lead/types";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskUpdatePayload,
} from "@/entities/task/types";
import { ApiError, apiRequest } from "@/shared/api/http";

export { ApiError };

/** Leads */
export function fetchLeads(params?: {
  status?: LeadStatus;
  no_contact_days?: number;
  next_action_due?: boolean;
  search?: string;
  include_inactive?: boolean;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.no_contact_days != null)
    q.set("no_contact_days", String(params.no_contact_days));
  if (params?.next_action_due) q.set("next_action_due", "true");
  if (params?.search) q.set("search", params.search);
  if (params?.include_inactive) q.set("include_inactive", "true");
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return apiRequest<Lead[]>(`/leads${qs ? `?${qs}` : ""}`);
}

export function fetchLead(id: number) {
  return apiRequest<Lead>(`/leads/${id}`);
}

export function updateLead(id: number, patch: LeadUpdatePayload) {
  return apiRequest<Lead>(`/leads/${id}`, { method: "PATCH", json: patch });
}

export function advanceLeadStage(id: number) {
  return apiRequest<Lead>(`/leads/${id}/advance`, { method: "POST" });
}

export function createLead(data: LeadCreatePayload) {
  return apiRequest<Lead>("/leads", { method: "POST", json: data });
}

export function fetchLeadsNoContact(days = 7) {
  return apiRequest<Lead[]>(`/leads/no-contact?days=${days}`);
}

export function fetchLeadsNextActionDue() {
  return apiRequest<Lead[]>(`/leads/next-action-due`);
}

export function fetchLeadInteractions(leadId: number) {
  return apiRequest<Interaction[]>(`/leads/${leadId}/interactions`);
}

export function createInteraction(
  leadId: number,
  body: { type: InteractionType; text: string },
) {
  return apiRequest<Interaction>(`/leads/${leadId}/interactions`, {
    method: "POST",
    json: body,
  });
}

/** Tasks */
export function fetchTasks(params?: {
  status?: TaskStatus;
  include_completed?: boolean;
  lead_id?: number;
  project_id?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.include_completed) q.set("include_completed", "true");
  if (params?.lead_id != null) q.set("lead_id", String(params.lead_id));
  if (params?.project_id != null) q.set("project_id", String(params.project_id));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
}

export function fetchTasksToday() {
  return apiRequest<Task[]>(`/tasks/today`);
}

export function fetchTasksOverdue() {
  return apiRequest<Task[]>(`/tasks/overdue`);
}

export function updateTask(id: number, patch: TaskUpdatePayload) {
  return apiRequest<Task>(`/tasks/${id}`, { method: "PATCH", json: patch });
}

export function deleteTask(id: number) {
  return apiRequest<void>(`/tasks/${id}`, { method: "DELETE" });
}

export function createTask(body: {
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  lead_id?: number | null;
  project_id?: number | null;
}) {
  return apiRequest<Task>("/tasks", { method: "POST", json: body });
}
