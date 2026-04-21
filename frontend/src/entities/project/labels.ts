import type { ProjectPriority, ProjectStatus } from "./types";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Запланирован",
  in_progress: "В работе",
  waiting_client: "Ждём клиента",
  on_hold: "Пауза",
  completed: "Завершён",
  cancelled: "Отменён",
};

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export function formatProjectStatus(status: ProjectStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatProjectPriority(priority: ProjectPriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  "planned",
  "in_progress",
  "waiting_client",
  "on_hold",
  "completed",
  "cancelled",
];

export const PROJECT_PRIORITY_OPTIONS: ProjectPriority[] = ["low", "medium", "high"];
