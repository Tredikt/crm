import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { Lead } from "@/entities/lead/types";
import type { Project } from "@/entities/project/types";
import { formatTaskPriority, formatTaskStatus } from "@/entities/task/labels";
import type { Task, TaskPriority, TaskStatus } from "@/entities/task/types";
import { TaskEditDialog } from "@/features/task-edit/TaskEditDialog";
import { addDaysUtc, formatDateTime, fromDatetimeLocalValue } from "@/shared/lib/dates";
import { queryKeys } from "@/shared/api/query-keys";
import { fetchProjects } from "@/shared/api/projects";
import { QueryError } from "@/widgets/query-error/QueryError";
import {
  createTask,
  deleteTask,
  fetchLeads,
  fetchTasks,
  fetchTasksOverdue,
  fetchTasksToday,
  updateTask,
} from "@/services/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Label } from "@/shared/ui/label";
import { SearchablePicker } from "@/shared/ui/searchable-picker";
import { Textarea } from "@/shared/ui/textarea";

type Filter = "today" | "overdue" | "all" | "completed";

export function TasksPage() {
  const [filter, setFilter] = useState<Filter>("all");
  /** На вкладке «Все»: по умолчанию выполненные скрыты; включите, чтобы показать в общем списке. */
  const [showCompletedInAll, setShowCompletedInAll] = useState(false);
  const [snoozeId, setSnoozeId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newPriority, setNewPriority] = useState<TaskPriority>("normal");
  const qc = useQueryClient();

  const leadsPickerQuery = useQuery({
    queryKey: queryKeys.leads.list({ picker: "tasks-create" }),
    queryFn: () => fetchLeads({ limit: 500 }),
    enabled: createOpen,
    staleTime: 60_000,
  });

  const projectsPickerQuery = useQuery({
    queryKey: queryKeys.projects.listParams({ picker: "tasks-create", active: true }),
    queryFn: () => fetchProjects({ limit: 500, is_active: true }),
    enabled: createOpen,
    staleTime: 60_000,
  });

  const projectPickerItems = useMemo(() => {
    const all = projectsPickerQuery.data ?? [];
    if (!selectedLead) return all;
    return all.filter((p) => p.lead_id === selectedLead.id);
  }, [projectsPickerQuery.data, selectedLead]);

  function resetCreateForm() {
    setNewTitle("");
    setNewDescription("");
    setNewDue("");
    setSelectedLead(null);
    setSelectedProject(null);
    setNewPriority("normal");
  }

  function onCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) resetCreateForm();
  }

  function onLeadPicked(lead: Lead | null) {
    setSelectedLead(lead);
    setSelectedProject((proj) => {
      if (!proj || !lead) return proj;
      if (proj.lead_id !== lead.id) return null;
      return proj;
    });
  }

  function onProjectPicked(project: Project | null) {
    setSelectedProject(project);
    if (!project) return;
    const leads = leadsPickerQuery.data ?? [];
    const lead = leads.find((l) => l.id === project.lead_id);
    if (lead) setSelectedLead(lead);
  }

  const listQuery = useQuery({
    queryKey:
      filter === "today"
        ? queryKeys.tasks.today()
        : filter === "overdue"
          ? queryKeys.tasks.overdue()
          : filter === "completed"
            ? queryKeys.tasks.list({ status: "completed" })
            : queryKeys.tasks.list({
                listKind: "all",
                include_completed: showCompletedInAll,
              }),
    queryFn: () =>
      filter === "today"
        ? fetchTasksToday()
        : filter === "overdue"
          ? fetchTasksOverdue()
          : filter === "completed"
            ? fetchTasks({ status: "completed", limit: 300 })
            : fetchTasks({
                include_completed: showCompletedInAll,
                limit: 300,
              }),
  });

  const completeMut = useMutation({
    mutationFn: (id: number) =>
      updateTask(id, { status: "completed" as TaskStatus }),
    onSuccess: () => invalidateAll(qc),
  });

  const snoozeMut = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) =>
      updateTask(id, { due_at: addDaysUtc(new Date().toISOString(), days) }),
    onSuccess: () => {
      invalidateAll(qc);
      setSnoozeId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      invalidateAll(qc);
      setDeleteTaskTarget(null);
    },
  });

  const createMut = useMutation({
    mutationFn: () => {
      const leadId =
        selectedLead?.id ?? (selectedProject ? selectedProject.lead_id : null) ?? null;
      return createTask({
        title: newTitle.trim(),
        description: newDescription.trim() ? newDescription.trim() : null,
        due_at: newDue ? fromDatetimeLocalValue(newDue) : null,
        lead_id: leadId,
        project_id: selectedProject?.id ?? null,
        priority: newPriority,
        status: "pending",
      });
    },
    onSuccess: () => {
      invalidateAll(qc);
      setCreateOpen(false);
      resetCreateForm();
    },
  });

  if (listQuery.isError) return <QueryError error={listQuery.error} />;

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "today", label: "Сегодня" },
    { id: "overdue", label: "Просрочено" },
    { id: "completed", label: "Выполненные" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Задачи</h1>
          <p className="text-sm text-ink-muted">Создание, фильтры и статусы</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => onCreateOpenChange(true)}>
          <Plus className="h-4 w-4" />
          Новая задача
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={filter === t.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        {filter === "all" ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line"
              checked={showCompletedInAll}
              onChange={(e) => setShowCompletedInAll(e.target.checked)}
            />
            Показать выполненные
          </label>
        ) : null}
      </div>

      {listQuery.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-2">
          {(listQuery.data ?? []).map((task) => (
            <Card key={task.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{task.title}</p>
                  {task.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    {task.due_at ? <span>{formatDateTime(task.due_at)}</span> : null}
                    {task.lead_id ? (
                      <Link className="text-accent hover:underline" to={`/leads/${task.lead_id}`}>
                        Лид #{task.lead_id}
                      </Link>
                    ) : null}
                    {task.project_id ? (
                      <Link
                        className="text-accent hover:underline"
                        to={`/projects/${task.project_id}`}
                      >
                        Проект #{task.project_id}
                      </Link>
                    ) : null}
                    <Badge tone="neutral">{formatTaskStatus(task.status)}</Badge>
                    <Badge tone="accent">{formatTaskPriority(task.priority)}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingTask(task)}
                  >
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-red-200 text-red-800 hover:bg-red-50"
                    onClick={() => setDeleteTaskTarget(task)}
                  >
                    Удалить
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={task.status === "completed" || completeMut.isPending}
                    onClick={() => completeMut.mutate(task.id)}
                  >
                    Готово
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={task.status === "completed"}
                    onClick={() => setSnoozeId(task.id)}
                  >
                    Перенести
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={snoozeId != null}
        onOpenChange={(o) => !o && setSnoozeId(null)}
        title="Перенести задачу"
      >
        {snoozeId != null ? (
          <div className="flex flex-wrap gap-2">
            {([1, 3, 7] as const).map((d) => (
              <Button
                key={d}
                variant="secondary"
                disabled={snoozeMut.isPending}
                onClick={() => snoozeMut.mutate({ id: snoozeId, days: d })}
              >
                +{d} дн.
              </Button>
            ))}
          </div>
        ) : null}
      </Dialog>

      <TaskEditDialog
        task={editingTask}
        open={editingTask != null}
        onOpenChange={(o) => !o && setEditingTask(null)}
        onSaved={() => invalidateAll(qc)}
      />

      <Dialog
        open={deleteTaskTarget != null}
        onOpenChange={(o) => !o && setDeleteTaskTarget(null)}
        title="Удалить задачу?"
      >
        {deleteTaskTarget ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              «{deleteTaskTarget.title}» — действие нельзя отменить.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={deleteMut.isPending}
                onClick={() => setDeleteTaskTarget(null)}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTaskTarget.id)}
              >
                Удалить
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={createOpen} onOpenChange={onCreateOpenChange} title="Новая задача">
        <div className="space-y-3">
          <div>
            <Label>Название</Label>
            <Input
              className="mt-1"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Что сделать"
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              className="mt-1 min-h-[72px]"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
          <div>
            <Label>Срок</Label>
            <Input
              type="datetime-local"
              className="mt-1"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
            />
          </div>
          <SearchablePicker<Lead>
            label="Лид (необязательно)"
            value={selectedLead}
            onChange={onLeadPicked}
            items={leadsPickerQuery.data ?? []}
            getId={(l) => l.id}
            getSearchText={(l) =>
              [l.full_name, l.username, l.phone, String(l.id)].filter(Boolean).join(" ")
            }
            getDisplayLabel={(l) => `${l.full_name} (#${l.id})`}
            isLoading={leadsPickerQuery.isPending}
            placeholder="Имя, телефон, @username, номер…"
            noneLabel="Без привязки к лиду"
            emptyListHint="Клиенты не загружены или нет совпадений"
          />
          <SearchablePicker<Project>
            label="Проект (необязательно)"
            value={selectedProject}
            onChange={onProjectPicked}
            items={projectPickerItems}
            getId={(p) => p.id}
            getSearchText={(p) =>
              [p.title, String(p.id), String(p.lead_id)].join(" ")
            }
            getDisplayLabel={(p) => `${p.title} (#${p.id})`}
            isLoading={projectsPickerQuery.isPending}
            placeholder="Название проекта или #id…"
            noneLabel="Без проекта"
            emptyListHint={
              selectedLead
                ? "У этого лида нет активных проектов или нет совпадений"
                : "Нет совпадений — выберите лида, чтобы сузить список"
            }
          />
          {selectedLead ? (
            <p className="text-xs text-ink-muted">
              В списке проектов только активные проекты выбранного лида.
            </p>
          ) : (
            <p className="text-xs text-ink-muted">
              Показаны все активные проекты. После выбора проекта лид подставится автоматически.
            </p>
          )}
          <div>
            <Label>Приоритет</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            >
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <Button
            className="w-full"
            variant="primary"
            disabled={!newTitle.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Создать
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
}
