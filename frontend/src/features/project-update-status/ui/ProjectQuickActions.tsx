import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { Project, ProjectStatus } from "@/entities/project/types";
import { isTerminalProjectStatus } from "@/entities/project/lib";
import { queryKeys } from "@/shared/api/query-keys";
import { updateProject } from "@/shared/api/projects";
import { ApiError } from "@/shared/api/http";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";

type ConfirmKind = "complete" | "cancel";

export function ProjectQuickActions({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const terminal = isTerminalProjectStatus(project.status);

  const mut = useMutation({
    mutationFn: (status: ProjectStatus) => updateProject(project.id, { status }),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
      await qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      await qc.invalidateQueries({ queryKey: queryKeys.projects.byLead(project.lead_id) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError && e.status === 409) {
        setError(e.message);
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Не удалось обновить статус");
      }
    },
  });

  if (terminal) {
    return (
      <p className="text-xs text-ink-muted">
        Проект в финальном статусе — смена этапа через полное редактирование недоступна.
      </p>
    );
  }

  const confirmTitle =
    confirmKind === "complete"
      ? "Завершить проект?"
      : confirmKind === "cancel"
        ? "Отменить проект?"
        : "";

  return (
    <div className="space-y-2">
      <Dialog
        open={confirmKind !== null}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title={confirmTitle}
      >
        <p className="text-sm text-ink-muted">
          {confirmKind === "complete"
            ? "Дата завершения проставится автоматически."
            : confirmKind === "cancel"
              ? "Проект перейдёт в статус «Отменён». Это действие можно изменить через редактирование карточки."
              : null}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={mut.isPending}
            onClick={() => setConfirmKind(null)}
          >
            Отмена
          </Button>
          <Button
            size="sm"
            variant={confirmKind === "cancel" ? "danger" : "primary"}
            disabled={mut.isPending || confirmKind === null}
            onClick={() => {
              if (confirmKind === "complete") mut.mutate("completed");
              if (confirmKind === "cancel") mut.mutate("cancelled");
              setConfirmKind(null);
            }}
          >
            Подтвердить
          </Button>
        </div>
      </Dialog>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={mut.isPending || project.status === "in_progress"}
          onClick={() => mut.mutate("in_progress")}
        >
          В работу
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={mut.isPending || project.status === "waiting_client"}
          onClick={() => mut.mutate("waiting_client")}
        >
          Ждём клиента
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={mut.isPending || project.status === "on_hold"}
          onClick={() => mut.mutate("on_hold")}
        >
          Пауза
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={mut.isPending}
          onClick={() => setConfirmKind("complete")}
        >
          Завершить
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="border-red-200 text-red-800 hover:bg-red-50"
          disabled={mut.isPending}
          onClick={() => setConfirmKind("cancel")}
        >
          Отменить
        </Button>
      </div>
    </div>
  );
}
