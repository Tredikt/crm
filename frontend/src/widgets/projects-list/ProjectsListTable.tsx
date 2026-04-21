import { Link } from "react-router-dom";

import type { Project } from "@/entities/project/types";
import { isProjectOverdue, isTerminalProjectStatus } from "@/entities/project/lib";
import { ProjectPriorityBadge } from "@/entities/project/ui/ProjectPriorityBadge";
import { ProjectStatusBadge } from "@/entities/project/ui/ProjectStatusBadge";
import { formatDateTime } from "@/shared/lib/dates";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

export function ProjectsListTable({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface-muted/40 px-4 py-8 text-center text-sm text-ink-muted">
        Нет проектов по текущим фильтрам
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((p) => {
        const overdue = isProjectOverdue(p);
        const terminal = isTerminalProjectStatus(p.status);
        return (
          <Card
            key={p.id}
            className={cn(
              "transition-opacity",
              terminal && "opacity-60",
              overdue && !terminal && "border-l-4 border-l-amber-400",
            )}
          >
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/projects/${p.id}`}
                    className="font-medium text-ink hover:text-accent hover:underline"
                  >
                    {p.title}
                  </Link>
                  {overdue && !terminal ? (
                    <Badge tone="warn">Просрочен</Badge>
                  ) : null}
                  {!p.is_active ? <Badge tone="neutral">Архив</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ProjectStatusBadge status={p.status} />
                  <ProjectPriorityBadge priority={p.priority} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <Link className="text-accent hover:underline" to={`/leads/${p.lead_id}`}>
                    Лид #{p.lead_id}
                  </Link>
                  <span>Дедлайн: {formatDateTime(p.deadline)}</span>
                  {p.budget ? <span>Бюджет: {p.budget}</span> : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
