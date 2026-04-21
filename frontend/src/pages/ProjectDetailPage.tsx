import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { Task, TaskStatus } from "@/entities/task/types";
import { TaskEditDialog } from "@/features/task-edit/TaskEditDialog";
import { queryKeys } from "@/shared/api/query-keys";
import { fetchProject } from "@/shared/api/projects";
import {
  createTask,
  deleteTask,
  fetchLead,
  fetchTasks,
  updateTask,
} from "@/services/api";
import { fromDatetimeLocalValue } from "@/shared/lib/dates";
import { QueryError } from "@/widgets/query-error/QueryError";
import { ProjectDetailSections } from "@/widgets/project-detail/ProjectDetailSections";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const qc = useQueryClient();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);

  const projectQuery = useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => fetchProject(id),
    enabled: Number.isFinite(id),
  });

  const leadId = projectQuery.data?.lead_id;
  const leadQuery = useQuery({
    queryKey: queryKeys.leads.detail(leadId ?? 0),
    queryFn: () => fetchLead(leadId!),
    enabled: leadId != null && Number.isFinite(leadId),
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list({ project_id: id }),
    queryFn: () => fetchTasks({ project_id: id, include_completed: true }),
    enabled: Number.isFinite(id),
  });

  const createTaskMut = useMutation({
    mutationFn: () =>
      createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() ? newTaskDescription.trim() : null,
        project_id: id,
        due_at: newTaskDue ? fromDatetimeLocalValue(newTaskDue) : null,
        priority: "normal",
        status: "pending",
      }),
    onSuccess: async () => {
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDue("");
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ project_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const deleteTaskMut = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: async () => {
      setDeleteTaskTarget(null);
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ project_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const completeTaskMut = useMutation({
    mutationFn: (taskId: number) =>
      updateTask(taskId, { status: "completed" as TaskStatus }),
    onSuccess: async () => {
      setCompletingId(null);
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ project_id: id }) });
      await qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  if (!Number.isFinite(id)) {
    return <p className="text-sm text-ink-muted">Некорректный id</p>;
  }
  if (projectQuery.isError) return <QueryError error={projectQuery.error} />;

  const project = projectQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Проекты
        </Link>
      </div>

      {projectQuery.isPending || !project ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <ProjectDetailSections
            project={project}
            lead={leadQuery.data}
            tasks={tasksQuery.data ?? []}
            newTaskTitle={newTaskTitle}
            newTaskDescription={newTaskDescription}
            newTaskDue={newTaskDue}
            onNewTaskTitle={setNewTaskTitle}
            onNewTaskDescription={setNewTaskDescription}
            onNewTaskDue={setNewTaskDue}
            onCreateTask={() => createTaskMut.mutate()}
            creatingTask={createTaskMut.isPending}
            onCompleteTask={(taskId) => {
              setCompletingId(taskId);
              completeTaskMut.mutate(taskId);
            }}
            onEditTask={setEditingTask}
            onDeleteTask={setDeleteTaskTarget}
            completingId={completingId}
          />

          <TaskEditDialog
            task={editingTask}
            open={editingTask != null}
            onOpenChange={(o) => !o && setEditingTask(null)}
            onSaved={async () => {
              await qc.invalidateQueries({ queryKey: queryKeys.tasks.list({ project_id: id }) });
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
        </>
      )}
    </div>
  );
}
