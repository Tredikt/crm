import { Link } from "react-router-dom";

import type { Lead } from "@/entities/lead/types";
import type { Project } from "@/entities/project/types";
import { ProjectPriorityBadge } from "@/entities/project/ui/ProjectPriorityBadge";
import { ProjectStatusBadge } from "@/entities/project/ui/ProjectStatusBadge";
import { ProjectQuickActions } from "@/features/project-update-status/ui/ProjectQuickActions";
import { formatTaskPriority, formatTaskStatus } from "@/entities/task/labels";
import type { Task } from "@/entities/task/types";
import { formatDateOnly, formatDateTime } from "@/shared/lib/dates";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

export function ProjectDetailSections({
  project,
  lead,
  tasks,
  newTaskTitle,
  newTaskDescription,
  newTaskDue,
  onNewTaskTitle,
  onNewTaskDescription,
  onNewTaskDue,
  onCreateTask,
  creatingTask,
  onCompleteTask,
  onEditTask,
  onDeleteTask,
  completingId,
}: {
  project: Project;
  lead: Lead | undefined;
  tasks: Task[];
  newTaskTitle: string;
  newTaskDescription: string;
  newTaskDue: string;
  onNewTaskTitle: (v: string) => void;
  onNewTaskDescription: (v: string) => void;
  onNewTaskDue: (v: string) => void;
  onCreateTask: () => void;
  creatingTask: boolean;
  onCompleteTask: (id: number) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  completingId: number | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{project.title}</h1>
            <ProjectStatusBadge status={project.status} />
            <ProjectPriorityBadge priority={project.priority} />
          </div>
          <p className="text-xs text-ink-muted">
            Проект #{project.id}
            {!project.is_active ? (
              <span className="ml-2 rounded border border-line px-1.5 py-0.5">Неактивен</span>
            ) : null}
          </p>
        </div>
        <Card className="min-w-0 flex-1 sm:max-w-xl">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ProjectQuickActions project={project} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Обзор</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {project.description ? (
            <div>
              <p className="text-xs font-medium text-ink-muted">Описание</p>
              <p className="mt-1 whitespace-pre-wrap text-ink">{project.description}</p>
            </div>
          ) : (
            <p className="text-ink-muted">Описание не заполнено</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-ink-muted">Старт</p>
              <p className="mt-0.5">{formatDateTime(project.start_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">Дедлайн</p>
              <p className="mt-0.5">{formatDateTime(project.deadline)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">Завершён</p>
              <p className="mt-0.5">{formatDateTime(project.completed_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">Бюджет</p>
              <p className="mt-0.5">{project.budget ?? "—"}</p>
            </div>
          </div>
          {project.comment ? (
            <div>
              <p className="text-xs font-medium text-ink-muted">Комментарий</p>
              <p className="mt-1 whitespace-pre-wrap text-ink">{project.comment}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Связанный лид</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lead ? (
            <>
              <Link className="font-medium text-accent hover:underline" to={`/leads/${lead.id}`}>
                {lead.full_name}
              </Link>
              <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
                <span>#{lead.id}</span>
                {lead.username ? <span>@{lead.username}</span> : null}
              </div>
            </>
          ) : (
            <Link className="text-sm text-accent hover:underline" to={`/leads/${project.lead_id}`}>
              Открыть лида #{project.lead_id}
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Задачи проекта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-ink-muted">
              Новая задача
              <Input
                className="mt-1"
                value={newTaskTitle}
                onChange={(e) => onNewTaskTitle(e.target.value)}
                placeholder="Что сделать"
              />
            </label>
            <label className="block text-xs font-medium text-ink-muted">
              Описание (опц.)
              <Textarea
                className="mt-1 min-h-[64px]"
                value={newTaskDescription}
                onChange={(e) => onNewTaskDescription(e.target.value)}
                placeholder="Детали…"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block text-xs font-medium text-ink-muted sm:w-52">
                Срок
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={newTaskDue}
                  onChange={(e) => onNewTaskDue(e.target.value)}
                />
              </label>
              <Button
                className="shrink-0"
                variant="primary"
                disabled={!newTaskTitle.trim() || creatingTask}
                onClick={onCreateTask}
              >
                Создать
              </Button>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-muted">Задач по проекту пока нет</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
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
                    <Button size="sm" variant="secondary" onClick={() => onEditTask(t)}>
                      Изменить
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-red-200 text-red-800 hover:bg-red-50"
                      onClick={() => onDeleteTask(t)}
                    >
                      Удалить
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={t.status === "completed" || completingId === t.id}
                      onClick={() => onCompleteTask(t.id)}
                    >
                      Готово
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Хронология</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-muted">
            Здесь позже появится активность по проекту (встречи, заметки, смены статуса). Сейчас
            используйте задачи и карточку лида.
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Создан: {formatDateOnly(project.created_at)} · Обновлён:{" "}
            {formatDateTime(project.updated_at)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
