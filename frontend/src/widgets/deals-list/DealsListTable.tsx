import { Link } from "react-router-dom";

import type { Deal } from "@/entities/deal/types";
import { formatMoney } from "@/entities/deal/labels";
import { isDealOverdue, isTerminalDealStatus } from "@/entities/deal/lib";
import { DealStatusBadge } from "@/entities/deal/ui/DealStatusBadge";
import { formatDateTime } from "@/shared/lib/dates";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

type Props = {
  deals: Deal[];
  onEdit: (deal: Deal) => void;
};

export function DealsListTable({ deals, onEdit }: Props) {
  if (deals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface-muted/40 px-4 py-8 text-center text-sm text-ink-muted">
        Нет сделок по текущим фильтрам
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {deals.map((d) => {
        const overdue = isDealOverdue(d);
        const terminal = isTerminalDealStatus(d.status);
        return (
          <Card
            key={d.id}
            className={cn(
              "transition-opacity",
              terminal && "opacity-70",
              overdue && !terminal && "border-l-4 border-l-amber-400",
            )}
          >
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(d)}
                    className="font-medium text-ink hover:text-accent hover:underline text-left"
                  >
                    {d.title}
                  </button>
                  {overdue && !terminal ? <Badge tone="warn">Просрочена</Badge> : null}
                  {!d.is_active ? <Badge tone="neutral">Архив</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DealStatusBadge status={d.status} />
                  <Badge tone="neutral">{d.probability}%</Badge>
                  <span className="text-sm font-medium text-ink">
                    {formatMoney(d.amount, d.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <Link className="text-accent hover:underline" to={`/leads/${d.lead_id}`}>
                    Лид #{d.lead_id}
                  </Link>
                  <span>Закрытие: {formatDateTime(d.expected_close_date)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
