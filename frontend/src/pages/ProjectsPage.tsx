import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import type { ProjectPriority, ProjectStatus } from "@/entities/project/types";
import {
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  formatProjectPriority,
  formatProjectStatus,
} from "@/entities/project/labels";
import { projectSortKey } from "@/entities/project/lib";
import { ProjectCreateDialog } from "@/features/project-create/ui/ProjectCreateDialog";
import { queryKeys } from "@/shared/api/query-keys";
import {
  fetchProjects,
  fetchProjectsActive,
  fetchProjectsOverdue,
} from "@/shared/api/projects";
import { QueryError } from "@/widgets/query-error/QueryError";
import { ProjectsListTable } from "@/widgets/projects-list/ProjectsListTable";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";

type Preset = "work" | "overdue" | "all";

export function ProjectsPage() {
  const [preset, setPreset] = useState<Preset>("work");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | "">("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.projects.listPreset(preset),
    queryFn: () => {
      if (preset === "work") return fetchProjectsActive();
      if (preset === "overdue") return fetchProjectsOverdue();
      return fetchProjects({ include_inactive: true, limit: 500 });
    },
  });

  const displayed = useMemo(() => {
    let rows = [...(listQuery.data ?? [])];
    if (statusFilter) {
      rows = rows.filter((p) => p.status === statusFilter);
    }
    if (priorityFilter) {
      rows = rows.filter((p) => p.priority === priorityFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) => p.title.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const da = projectSortKey(a);
      const db = projectSortKey(b);
      if (da !== db) return da - db;
      return b.id - a.id;
    });
    return rows;
  }, [listQuery.data, statusFilter, priorityFilter, search]);

  if (listQuery.isError) return <QueryError error={listQuery.error} />;

  const presets: { id: Preset; label: string }[] = [
    { id: "work", label: "В работе" },
    { id: "overdue", label: "Просрочено" },
    { id: "all", label: "Все" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FolderKanban className="mt-0.5 h-5 w-5 text-ink-muted" />
          <div>
            <h1 className="text-lg font-semibold text-ink">Проекты</h1>
            <p className="text-sm text-ink-muted">
              Заказы и реализации по лидам — статусы, сроки, задачи
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Новый проект
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((t) => (
          <Button
            key={t.id}
            variant={preset === t.id ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPreset(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[140px] flex-1 text-xs font-medium text-ink-muted">
          Поиск по названию
          <Input
            className="mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Начните вводить…"
          />
        </label>
        <label className="block w-full text-xs font-medium text-ink-muted sm:w-40">
          Статус
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "")}
          >
            <option value="">Любой</option>
            {PROJECT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatProjectStatus(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-full text-xs font-medium text-ink-muted sm:w-36">
          Приоритет
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ProjectPriority | "")}
          >
            <option value="">Любой</option>
            {PROJECT_PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {formatProjectPriority(p)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {listQuery.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <ProjectsListTable projects={displayed} />
      )}

      <ProjectCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
