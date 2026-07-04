import { useQuery } from "@tanstack/react-query";
import { HandCoins, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import type { Deal, DealStatus } from "@/entities/deal/types";
import {
  DEAL_STATUS_OPTIONS,
  formatDealStatus,
  formatMoney,
} from "@/entities/deal/labels";
import { dealSortKey } from "@/entities/deal/lib";
import { DealCreateDialog } from "@/features/deal-create/ui/DealCreateDialog";
import { DealEditDialog } from "@/features/deal-edit/DealEditDialog";
import { queryKeys } from "@/shared/api/query-keys";
import {
  fetchDeals,
  fetchDealsOpen,
  fetchDealsOverdue,
  fetchDealsSummary,
} from "@/shared/api/deals";
import { DealFunnelChart } from "@/widgets/deals/DealFunnelChart";
import { QueryError } from "@/widgets/query-error/QueryError";
import { DealsListTable } from "@/widgets/deals-list/DealsListTable";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";

type Preset = "open" | "overdue" | "all";

export function DealsPage() {
  const [preset, setPreset] = useState<Preset>("open");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "">("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const summaryQuery = useQuery({
    queryKey: queryKeys.deals.summary(),
    queryFn: fetchDealsSummary,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.deals.listPreset(preset),
    queryFn: () => {
      if (preset === "open") return fetchDealsOpen();
      if (preset === "overdue") return fetchDealsOverdue();
      return fetchDeals({ include_inactive: true, limit: 500 });
    },
  });

  const displayed = useMemo(() => {
    let rows = [...(listQuery.data ?? [])];
    if (statusFilter) {
      rows = rows.filter((d) => d.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((d) => d.title.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const da = dealSortKey(a);
      const db = dealSortKey(b);
      if (da !== db) return da - db;
      return b.id - a.id;
    });
    return rows;
  }, [listQuery.data, statusFilter, search]);

  if (listQuery.isError) return <QueryError error={listQuery.error} />;

  const summary = summaryQuery.data;
  const currency = summary?.currency ?? "RUB";

  const presets: { id: Preset; label: string }[] = [
    { id: "open", label: "Открытые" },
    { id: "overdue", label: "Просрочено" },
    { id: "all", label: "Все" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <HandCoins className="mt-0.5 h-5 w-5 text-ink-muted" />
          <div>
            <h1 className="text-lg font-semibold text-ink">Сделки</h1>
            <p className="text-sm text-ink-muted">
              Pipeline продаж: суммы, вероятность, прогноз выручки
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Новая сделка
        </Button>
      </div>

      {summaryQuery.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-ink-muted">Открытые</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-ink">{summary.open_count}</p>
              <p className="text-xs text-ink-muted">
                {formatMoney(summary.open_total_amount, currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-ink-muted">
                Взвешенный pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-ink">
                {formatMoney(summary.weighted_pipeline, currency)}
              </p>
              <p className="text-xs text-ink-muted">С учётом вероятности</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-ink-muted">Выиграно</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-ink">
                {formatMoney(summary.won_total_amount, currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-ink-muted">По этапам</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-ink-muted">
              {summary.by_status.length === 0 ? (
                <p>Нет сделок</p>
              ) : (
                summary.by_status.map((row) => (
                  <div key={row.status} className="flex justify-between gap-2">
                    <span>{formatDealStatus(row.status)}</span>
                    <span>
                      {row.count} · {formatMoney(row.total_amount, currency)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {summary ? <DealFunnelChart summary={summary} /> : null}

      <div className="flex flex-wrap gap-2">
        {presets.map((t) => (
          <Button
            key={t.id}
            variant={preset === t.id ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPreset(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[140px] flex-1 text-xs font-medium text-ink-muted">
          Поиск по названию
          <Input
            className="mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Начните вводить…"
          />
        </label>
        <label className="block w-full text-xs font-medium text-ink-muted sm:w-40">
          Этап
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DealStatus | "")}
          >
            <option value="">Любой</option>
            {DEAL_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatDealStatus(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {listQuery.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <DealsListTable deals={displayed} onEdit={setEditingDeal} />
      )}

      <DealCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DealEditDialog
        deal={editingDeal}
        open={editingDeal != null}
        onOpenChange={(open) => {
          if (!open) setEditingDeal(null);
        }}
      />
    </div>
  );
}
