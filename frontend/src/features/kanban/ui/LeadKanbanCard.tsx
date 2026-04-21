import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import type { Lead } from "@/entities/lead/types";
import { formatLeadStatus } from "@/entities/lead/status-labels";
import { formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";

export function LeadKanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const overdue =
    lead.next_action_at && new Date(lead.next_action_at) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border border-line bg-white p-3 shadow-soft active:cursor-grabbing",
        isDragging && "opacity-60 ring-2 ring-accent/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/leads/${lead.id}`}
          className="text-sm font-medium text-ink hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {lead.full_name}
        </Link>
        <Link
          to={`/leads/${lead.id}`}
          className="text-ink-muted hover:text-ink"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
      {lead.username ? (
        <p className="mt-1 text-xs text-ink-muted">@{lead.username}</p>
      ) : null}
      {lead.next_action ? (
        <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{lead.next_action}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge tone="neutral">{formatLeadStatus(lead.status)}</Badge>
        {lead.next_action_at ? (
          <Badge tone={overdue ? "danger" : "neutral"}>
            {formatDateTime(lead.next_action_at)}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
