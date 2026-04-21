import type { TaskPriority, TaskStatus } from "./types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "К выполнению",
  in_progress: "В работе",
  completed: "Выполнена",
  cancelled: "Отменена",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};

export function formatTaskStatus(status: TaskStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatTaskPriority(priority: TaskPriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}
