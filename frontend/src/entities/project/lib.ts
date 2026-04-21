import type { Project, ProjectStatus } from "./types";

export function isTerminalProjectStatus(status: ProjectStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/** Просрочка по правилам CRM: дедлайн в прошлом и статус не финальный. */
export function isProjectOverdue(project: Project, now = new Date()): boolean {
  if (isTerminalProjectStatus(project.status)) return false;
  if (!project.deadline) return false;
  return new Date(project.deadline).getTime() < now.getTime();
}

export function projectSortKey(project: Project): number {
  const dl = project.deadline ? new Date(project.deadline).getTime() : Number.POSITIVE_INFINITY;
  return dl;
}
