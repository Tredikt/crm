export type ProjectStatus =
  | "planned"
  | "in_progress"
  | "waiting_client"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectPriority = "low" | "medium" | "high";

export interface Project {
  id: number;
  lead_id: number;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget: string | null;
  start_date: string | null;
  deadline: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  is_active: boolean;
}

export interface ProjectCreatePayload {
  lead_id: number;
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  budget?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  comment?: string | null;
  is_active?: boolean;
}

/** Тело POST /leads/{id}/projects */
export interface ProjectCreateForLeadPayload {
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  budget?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  comment?: string | null;
}

export interface ProjectUpdatePayload {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  budget?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  completed_at?: string | null;
  comment?: string | null;
  is_active?: boolean;
}
