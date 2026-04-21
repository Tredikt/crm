export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: number;
  lead_id: number | null;
  project_id: number | null;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  due_at?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  lead_id?: number | null;
  project_id?: number | null;
}
