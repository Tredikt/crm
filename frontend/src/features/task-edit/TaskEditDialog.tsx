import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Task, TaskPriority } from "@/entities/task/types";
import { ApiError, updateTask } from "@/services/api";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSaved,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDue(toDatetimeLocalValue(task.due_at));
      setPriority(task.priority);
      setError(null);
    }
  }, [task, open]);

  const mut = useMutation({
    mutationFn: () => {
      if (!task) throw new Error("no task");
      return updateTask(task.id, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        due_at: due ? fromDatetimeLocalValue(due) : null,
        priority,
      });
    },
    onSuccess: () => {
      setError(null);
      onSaved();
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Редактировать задачу">
      {task ? (
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : null}
          <div>
            <Label htmlFor={`edit-task-title-${task.id}`}>Название</Label>
            <Input
              id={`edit-task-title-${task.id}`}
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-task-desc-${task.id}`}>Описание</Label>
            <Textarea
              id={`edit-task-desc-${task.id}`}
              className="mt-1 min-h-[88px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>
          <div>
            <Label htmlFor={`edit-task-due-${task.id}`}>Срок</Label>
            <Input
              id={`edit-task-due-${task.id}`}
              type="datetime-local"
              className="mt-1"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`edit-task-prio-${task.id}`}>Приоритет</Label>
            <select
              id={`edit-task-prio-${task.id}`}
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <Button
            className="w-full"
            variant="primary"
            disabled={!title.trim() || mut.isPending}
            onClick={() => mut.mutate()}
          >
            Сохранить
          </Button>
        </div>
      ) : null}
    </Dialog>
  );
}
