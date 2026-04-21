import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Project, ProjectPriority, ProjectStatus } from "@/entities/project/types";
import {
  formatProjectPriority,
  formatProjectStatus,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "@/entities/project/labels";
import { fetchLeads } from "@/services/api";
import { queryKeys } from "@/shared/api/query-keys";
import {
  createProject,
  createProjectForLead,
} from "@/shared/api/projects";
import { ApiError } from "@/shared/api/http";
import { fromDatetimeLocalValue } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Если задан — лид фиксирован (создание с карточки лида). */
  fixedLeadId?: number;
  onCreated?: (project: Project) => void;
};

export function ProjectCreateDialog({
  open,
  onOpenChange,
  fixedLeadId,
  onCreated,
}: Props) {
  const qc = useQueryClient();
  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.list({ limit: 400 }),
    queryFn: () => fetchLeads({ limit: 400 }),
    enabled: open && fixedLeadId == null,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [priority, setPriority] = useState<ProjectPriority>("medium");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [comment, setComment] = useState("");
  const [leadId, setLeadId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (fixedLeadId != null) {
      setLeadId(String(fixedLeadId));
    } else {
      setLeadId("");
    }
  }, [open, fixedLeadId]);

  const mutate = useMutation({
    mutationFn: async () => {
      if (fixedLeadId != null) {
        return createProjectForLead(fixedLeadId, {
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          budget: budget.trim() || null,
          start_date: startDate ? fromDatetimeLocalValue(startDate) : null,
          deadline: deadline ? fromDatetimeLocalValue(deadline) : null,
          comment: comment.trim() || null,
        });
      }
      const lid = parseInt(leadId, 10);
      if (!Number.isFinite(lid)) {
        throw new Error("Выберите лида");
      }
      return createProject({
        lead_id: lid,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        budget: budget.trim() || null,
        start_date: startDate ? fromDatetimeLocalValue(startDate) : null,
        deadline: deadline ? fromDatetimeLocalValue(deadline) : null,
        comment: comment.trim() || null,
      });
    },
    onSuccess: async (project) => {
      await qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      if (fixedLeadId != null) {
        await qc.invalidateQueries({ queryKey: queryKeys.projects.byLead(fixedLeadId) });
      }
      setTitle("");
      setDescription("");
      setStatus("planned");
      setPriority("medium");
      setBudget("");
      setStartDate("");
      setDeadline("");
      setComment("");
      onOpenChange(false);
      onCreated?.(project);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Не удалось создать проект");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Новый проект">
      <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto pr-1">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div>
          <Label>Название</Label>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заказ / этап работы"
          />
        </div>
        {fixedLeadId == null ? (
          <div>
            <Label>Лид</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              disabled={leadsQuery.isPending}
            >
              <option value="">— выберите —</option>
              {(leadsQuery.data ?? []).map((l) => (
                <option key={l.id} value={String(l.id)}>
                  #{l.id} {l.full_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Лид #{fixedLeadId} — из карточки клиента</p>
        )}
        <div>
          <Label>Описание</Label>
          <Textarea
            className="mt-1 min-h-[56px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Статус</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatProjectStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Приоритет</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-xs"
              value={priority}
              onChange={(e) => setPriority(e.target.value as ProjectPriority)}
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
          <Label>Бюджет</Label>
          <Input
            className="mt-1"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Опционально"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label>Старт</Label>
            <Input
              type="datetime-local"
              className="mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Дедлайн</Label>
            <Input
              type="datetime-local"
              className="mt-1"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Комментарий</Label>
          <Textarea
            className="mt-1 min-h-[48px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <Button
          className="w-full"
          variant="primary"
          disabled={!title.trim() || mutate.isPending}
          onClick={() => {
            setError(null);
            mutate.mutate();
          }}
        >
          Создать проект
        </Button>
      </div>
    </Dialog>
  );
}
