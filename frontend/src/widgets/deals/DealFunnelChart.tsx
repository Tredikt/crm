import type { DealSummary } from "@/entities/deal/types";
import { formatDealStatus } from "@/entities/deal/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function DealFunnelChart({ summary }: { summary: DealSummary }) {
  const rows = summary.by_status.filter((r) => r.count > 0);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Воронка сделок</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.win_rate != null ? (
          <p className="text-sm text-ink-muted">
            Win rate: <strong className="text-ink">{summary.win_rate}%</strong> ({summary.lost_count}{" "}
            проиграно)
          </p>
        ) : (
          <p className="text-sm text-ink-muted">Win rate появится после закрытых сделок</p>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Нет сделок для графика</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.status}>
                <div className="mb-1 flex justify-between text-xs text-ink-muted">
                  <span>{formatDealStatus(row.status)}</span>
                  <span>{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
