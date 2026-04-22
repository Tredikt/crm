import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Project, ProjectPriority, ProjectStatus } from "@/entities/project/types";
import {
  formatProjectPriority,
  formatProjectStatus,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "@/entities/project/labels";
import { queryKeys } from "@/shared/api/query-keys";
import { updateProject } from "@/shared/api/projects";
import { ApiError } from "@/shared/api/http";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

type Props = {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

function projectToForm(p: Project) {
  return {
    title: p.title,
    description: p.description ?? "",
    status: p.status,
    priority: p.priority,
    budget: p.budget ?? "",
    startDate: toDatetimeLocalValue(p.start_date),
    deadline: toDatetimeLocalValue(p.deadline),
    comment: p.comment ?? "",
    isActive: p.is_active,
  };
}

export function ProjectEditDialog({ project, open, onOpenChange, onSaved }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => projectToForm(project));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(projectToForm(project));
  }, [open, project]);

  const mut = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        budget: form.budget.trim() || null,
        start_date: form.startDate ? fromDatetimeLocalValue(form.startDate) : null,
        deadline: form.deadline ? fromDatetimeLocalValue(form.deadline) : null,
        comment: form.comment.trim() || null,
        is_active: form.isActive,
      };
      return updateProject(project.id, body);
    },
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
      await qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      await qc.invalidateQueries({ queryKey: queryKeys.projects.byLead(project.lead_id) });
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Не удалось сохранить проект");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Редактирование проекта">
      <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto pr-1">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <p className="text-xs text-ink-muted">Проект #{project.id} · лид #{project.lead_id}</p>
        <div>
          <Label htmlFor="edit-project-title">Название</Label>
          <Input
            id="edit-project-title"
            className="mt-1"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="edit-project-desc">Описание</Label>
          <Textarea
            id="edit-project-desc"
            className="mt-1 min-h-[56px]"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="edit-project-status">Статус</Label>
            <select
              id="edit-project-status"
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-xs"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
            >
              {PROJECT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatProjectStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="edit-project-priority">Приоритет</Label>
            <select
              id="edit-project-priority"
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-xs"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value as ProjectPriority }))
              }
            >
              {PROJECT_PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {formatProjectPriority(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="edit-project-budget">Бюджет</Label>
          <Input
            id="edit-project-budget"
            className="mt-1"
            value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            placeholder="Опционально"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-project-start">Старт</Label>
            <Input
              id="edit-project-start"
              type="datetime-local"
              className="mt-1"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="edit-project-deadline">Дедлайн</Label>
            <Input
              id="edit-project-deadline"
              type="datetime-local"
              className="mt-1"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="edit-project-comment">Комментарий</Label>
          <Textarea
            id="edit-project-comment"
            className="mt-1 min-h-[48px]"
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-line"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Активен в списках
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            variant="primary"
            disabled={!form.title.trim() || mut.isPending}
            onClick={() => {
              setError(null);
              mut.mutate();
            }}
          >
            Сохранить
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            disabled={mut.isPending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
