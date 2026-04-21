import { useDroppable } from "@dnd-kit/core";

import type { KanbanColumn as Col } from "@/features/kanban/model/column-config";
import type { Lead } from "@/entities/lead/types";
import { LeadKanbanCard } from "@/features/kanban/ui/LeadKanbanCard";
import { cn } from "@/shared/lib/cn";

export function KanbanColumnView({
  column,
  leads,
}: {
  column: Col;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}` });

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg border border-line bg-surface-muted/80">
      <div className="border-b border-line px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {column.title}
        </h3>
        <p className="text-xs text-ink-muted">{leads.length}</p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2",
          isOver && "bg-accent/5",
        )}
      >
        {leads.map((lead) => (
          <LeadKanbanCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
