import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { LeadStatus } from "@/entities/lead/types";
import { formatLeadStatus, LEAD_STATUS_ORDER } from "@/entities/lead/status-labels";
import { isProjectOverdue, isTerminalProjectStatus } from "@/entities/project/lib";
import { ProjectPriorityBadge } from "@/entities/project/ui/ProjectPriorityBadge";
import { ProjectStatusBadge } from "@/entities/project/ui/ProjectStatusBadge";
import { formatInteractionType } from "@/entities/interaction/labels";
import { formatTaskPriority, formatTaskStatus } from "@/entities/task/labels";
import type { Task, TaskStatus } from "@/entities/task/types";
import { ProjectCreateDialog } from "@/features/project-create/ui/ProjectCreateDialog";
import { TaskEditDialog } from "@/features/task-edit/TaskEditDialog";
import { queryKeys } from "@/shared/api/query-keys";
import { fetchLeadProjects } from "@/shared/api/projects";
import {
  addDaysUtc,
  formatDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/shared/lib/dates";
import { QueryError } from "@/widgets/query-error/QueryError";
import {
  advanceLeadStage,
  ApiError,
  createInteraction,
  createTask,
  deleteTask,
  fetchLead,
  fetchLeadInteractions,
  fetchTasks,
  updateLead,
  updateTask,
} from "@/services/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { Dialog } from "@/shared/ui/dialog";

export function LeadDetailPage() {
  const { leadId } = useParams();
  const id = Number(leadId);
  const qc = useQueryClient();

  const leadQuery = useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => fetchLead(id),
    enabled: Number.isFinite(id),
  });

  const interQuery = useQuery({
    queryKey: queryKeys.leads.interactions(id),
    queryFn: () => fetchLeadInteractions(id),
    enabled: Number.isFinite(id),
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list({ lead_id: id }),
    queryFn: () => fetchTasks({ lead_id: id, include_completed: true }),
    enabled: Number.isFinite(id),
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.byLead(id),
    queryFn: () => fetchLeadProjects(id),
    enabled: Number.isFinite(id),
  });

  const [note, setNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [snoozeTaskId, setSnoozeTaskId] = useState<number | null>(null);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const patchLead = useMutation({
    mutationFn: (patch: Parameters<typeof updateLead>[1]) => updateLead(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      await qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });

  const advanceMut = useMutation({
    mutationFn: () => advanceLeadStage(id),
    onSuccess: async () => {
      setAdvanceError(null);
      await qc.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
      await qc.invalidateQueries({ queryKey: queryKeys.leads.interactions(id) });
      await qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setAdvanceError("Для текущего этапа нет следующего шага воронки.");
      } else if (err instanceof ApiError) {
        setAdvanceError(err.message);
      } else {
        setAdvanceError("Не удалось сменить этап.");
      }
    },
  });

  const addNote = useMutation({
    mutationFn: () => createInteraction(id, { type: "note", text: note.trim() }),
    onSuccess: async () => {
      setNote("");
      await qc.invalidateQueries({ queryKey: queryKeys.leads.interactions(id) });
      await qc.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    },
  });

  const createTaskMut = useMutation({
    mutationFn: () =>
      createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() ? newTaskDescription.trim() : null,
        lead_id: id,
        due_at: newTaskDue ? fromDatetimeLocalValue(newTaskDue) : null,
        priority: "normal",
        status: "pending",
      }),
    onSuccess: async () => {
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDue("");
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ lead_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const deleteTaskMut = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: async () => {
      setDeleteTaskTarget(null);
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ lead_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const completeTaskMut = useMutation({
    mutationFn: (taskId: number) =>
      updateTask(taskId, { status: "completed" as TaskStatus }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ lead_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const snoozeTaskMut = useMutation({
    mutationFn: ({ taskId, days }: { taskId: number; days: number }) =>
      updateTask(taskId, { due_at: addDaysUtc(new Date().toISOString(), days) }),
    onSuccess: async () => {
      setSnoozeTaskId(null);
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ lead_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  if (!Number.isFinite(id)) return <p className="text-sm text-ink-muted">Некорректный id</p>;
  if (leadQuery.isError) return <QueryError error={leadQuery.error} />;

  const lead = leadQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Воронка
        </Link>
      </div>

      {leadQuery.isPending || !lead ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-ink">{lead.full_name}</h1>
              <Badge tone="accent">{formatLeadStatus(lead.status)}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-ink-muted">
              {lead.username ? <span>@{lead.username}</span> : null}
              {lead.phone ? <span>{lead.phone}</span> : null}
              {lead.source ? <span>источник: {lead.source}</span> : null}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Статус воронки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-xs font-medium text-ink-muted">
                Этап
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                  value={lead.status}
                  onChange={(e) =>
                    patchLead.mutate({ status: e.target.value as LeadStatus })
                  }
                >
                  {LEAD_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {formatLeadStatus(s)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={advanceMut.isPending}
                  onClick={() => {
                    setAdvanceError(null);
                    advanceMut.mutate();
                  }}
                >
                  {advanceMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Следующий этап воронки
                </Button>
                <span className="text-xs text-ink-muted">
                  Как в Telegram: один шаг по линейной воронке
                </span>
              </div>
              {advanceError ? (
                <p className="text-sm text-red-700">{advanceError}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Поля</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-ink-muted md:col-span-2">
                Следующий шаг (текст)
                <Textarea
                  className="mt-1"
                  defaultValue={lead.next_action ?? ""}
                  key={lead.updated_at}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if ((lead.next_action ?? "") !== v) {
                      patchLead.mutate({ next_action: v || null });
                    }
                  }}
                />
              </label>
              <label className="block text-xs font-medium text-ink-muted md:col-span-2">
                Следующий шаг (когда)
                <Input
                  type="datetime-local"
                  className="mt-1"
                  defaultValue={toDatetimeLocalValue(lead.next_action_at)}
                  key={`${lead.id}-${lead.next_action_at}`}
                  onBlur={(e) => {
                    const iso = fromDatetimeLocalValue(e.target.value);
                    const prev = lead.next_action_at;
                    if (iso !== prev) patchLead.mutate({ next_action_at: iso });
                  }}
                />
              </label>
              <label className="block text-xs font-medium text-ink-muted md:col-span-2">
                Комментарий
                <Textarea
                  className="mt-1"
                  defaultValue={lead.comment ?? ""}
                  key={`c-${lead.updated_at}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if ((lead.comment ?? "") !== v) {
                      patchLead.mutate({ comment: v || null });
                    }
                  }}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle>Проекты</CardTitle>
              <Button size="sm" variant="secondary" onClick={() => setProjectDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Создать проект
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectsQuery.isPending ? (
                <Skeleton className="h-12 w-full" />
              ) : (projectsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-muted">Проектов пока нет</p>
              ) : (
                <ul className="space-y-2">
                  {projectsQuery.data!.map((p) => {
                    const overdue = isProjectOverdue(p);
                    const term = isTerminalProjectStatus(p.status);
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/projects/${p.id}`}
                          className={`flex flex-col gap-1 rounded-md border border-line px-3 py-2 text-sm transition-opacity hover:bg-surface-muted ${term ? "opacity-60" : ""} ${overdue && !term ? "border-l-4 border-l-amber-400" : ""}`}
                        >
                          <span className="font-medium text-ink">{p.title}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <ProjectStatusBadge status={p.status} />
                            <ProjectPriorityBadge priority={p.priority} />
                            {overdue && !term ? (
                              <Badge tone="warn">Просрочен</Badge>
                            ) : null}
                          </div>
                          <span className="text-xs text-ink-muted">
                            Дедлайн: {formatDateTime(p.deadline)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Новая задача по лиду</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-xs font-medium text-ink-muted">
                Название
                <Input
                  className="mt-1"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Например: Написать в Telegram"
                />
              </label>
              <label className="block text-xs font-medium text-ink-muted">
                Описание (опц.)
                <Textarea
                  className="mt-1 min-h-[72px]"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Детали, ссылки…"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block text-xs font-medium text-ink-muted sm:w-52">
                  Срок (опц.)
                  <Input
                    type="datetime-local"
                    className="mt-1"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                  />
                </label>
                <Button
                  className="shrink-0"
                  disabled={!newTaskTitle.trim() || createTaskMut.isPending}
                  onClick={() => createTaskMut.mutate()}
                >
                  <Plus className="h-4 w-4" />
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  placeholder="Заметка о касании…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[72px] flex-1"
                />
                <Button
                  className="shrink-0 self-end sm:self-stretch"
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() => addNote.mutate()}
                >
                  <Plus className="h-4 w-4" />
                  Добавить
                </Button>
              </div>
              {interQuery.isPending ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <ul className="space-y-2">
                  {(interQuery.data ?? []).map((i) => (
                    <li
                      key={i.id}
                      className="rounded-md border border-line bg-white px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">{formatInteractionType(i.type)}</Badge>
                        <span className="text-xs text-ink-muted">
                          {formatDateTime(i.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-ink">{i.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Задачи по лиду</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksQuery.isPending ? (
                <Skeleton className="h-16 w-full" />
              ) : (tasksQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-muted">Задач нет</p>
              ) : (
                <ul className="space-y-2">
                  {tasksQuery.data!.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-col gap-2 rounded-md border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{t.title}</span>
                        {t.description ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                            {t.description}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-muted">
                          {t.due_at ? <span>{formatDateTime(t.due_at)}</span> : null}
                          <Badge tone="neutral">{formatTaskStatus(t.status)}</Badge>
                          <Badge tone="accent">{formatTaskPriority(t.priority)}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditingTask(t)}>
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-red-200 text-red-800 hover:bg-red-50"
                          onClick={() => setDeleteTaskTarget(t)}
                        >
                          Удалить
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={t.status === "completed"}
                          onClick={() => completeTaskMut.mutate(t.id)}
                        >
                          Готово
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={t.status === "completed"}
                          onClick={() => setSnoozeTaskId(t.id)}
                        >
                          Перенести
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ProjectCreateDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        fixedLeadId={id}
      />

      <TaskEditDialog
        task={editingTask}
        open={editingTask != null}
        onOpenChange={(o) => !o && setEditingTask(null)}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ lead_id: id }) });
          await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
        }}
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
                disabled={deleteTaskMut.isPending}
                onClick={() => setDeleteTaskTarget(null)}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={deleteTaskMut.isPending}
                onClick={() => deleteTaskMut.mutate(deleteTaskTarget.id)}
              >
                Удалить
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={snoozeTaskId != null}
        onOpenChange={(o) => !o && setSnoozeTaskId(null)}
        title="Перенести задачу"
      >
        {snoozeTaskId != null ? (
          <div className="flex flex-wrap gap-2">
            {([1, 3, 7] as const).map((d) => (
              <Button
                key={d}
                variant="secondary"
                disabled={snoozeTaskMut.isPending}
                onClick={() => snoozeTaskMut.mutate({ taskId: snoozeTaskId, days: d })}
              >
                +{d} дн.
              </Button>
            ))}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
