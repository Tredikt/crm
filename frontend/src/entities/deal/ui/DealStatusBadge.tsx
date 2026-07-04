import type { DealStatus } from "../types";
import { formatDealStatus } from "../labels";
import { isTerminalDealStatus } from "../lib";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

function toneForStatus(status: DealStatus): "neutral" | "accent" | "warn" | "danger" {
  if (status === "won") return "accent";
  if (status === "lost") return "danger";
  switch (status) {
    case "negotiation":
      return "warn";
    case "proposal":
      return "accent";
    default:
      return "neutral";
  }
}

export function DealStatusBadge({
  status,
  className,
}: {
  status: DealStatus;
  className?: string;
}) {
  return (
    <Badge
      tone={toneForStatus(status)}
      className={cn(isTerminalDealStatus(status) && "opacity-80", className)}
    >
      {formatDealStatus(status)}
    </Badge>
  );
}
