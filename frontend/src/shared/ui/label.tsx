import type { LabelHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-medium text-ink-muted", className)}
      {...props}
    />
  );
}
