import type { ProjectStatus } from "../types";
import { formatProjectStatus } from "../labels";
import { isTerminalProjectStatus } from "../lib";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

function toneForStatus(status: ProjectStatus): "neutral" | "accent" | "warn" | "danger" {
  if (isTerminalProjectStatus(status)) return "neutral";
  switch (status) {
    case "in_progress":
      return "accent";
    case "waiting_client":
      return "warn";
    case "on_hold":
      return "neutral";
    default:
      return "neutral";
  }
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <Badge
      tone={toneForStatus(status)}
      className={cn(isTerminalProjectStatus(status) && "opacity-70", className)}
    >
      {formatProjectStatus(status)}
    </Badge>
  );
}
