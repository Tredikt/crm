import type { ProjectPriority } from "../types";
import { formatProjectPriority } from "../labels";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

export function ProjectPriorityBadge({
  priority,
  className,
}: {
  priority: ProjectPriority;
  className?: string;
}) {
  const tone =
    priority === "high" ? "danger" : priority === "medium" ? "warn" : "neutral";
  return (
    <Badge tone={tone} className={cn(className)}>
      {formatProjectPriority(priority)}
    </Badge>
  );
}
