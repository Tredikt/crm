import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Table2, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  columnForLeadStatus,
  KANBAN_COLUMNS,
} from "@/features/kanban/model/column-config";
import { KanbanColumnView } from "@/features/kanban/ui/KanbanColumn";
import type { Lead, LeadStatus } from "@/entities/lead/types";
import { formatLeadStatus, LEAD_STATUS_ORDER } from "@/entities/lead/status-labels";
import { queryKeys } from "@/shared/api/query-keys";
import { QueryError } from "@/widgets/query-error/QueryError";
import { LeadsTableView } from "@/widgets/leads-table/LeadsTableView";
import { fetchLeads, updateLead } from "@/services/api";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";

type LeadsView = "kanban" | "table";

export function LeadsKanbanPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: LeadsView =
    searchParams.get("view") === "table" ? "table" : "kanban";

  const statusFilter = (searchParams.get("status") as LeadStatus | "") || "";
  const includeInactive = searchParams.get("inactive") === "1";

  const setView = (next: LeadsView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "table") nextParams.set("view", "table");
    else {
      nextParams.delete("view");
      nextParams.delete("status");
      nextParams.delete("inactive");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setStatusFilter = (status: LeadStatus | "") => {
    const nextParams = new URLSearchParams(searchParams);
    if (status) nextParams.set("status", status);
    else nextParams.delete("status");
    setSearchParams(nextParams, { replace: true });
  };

  const setIncludeInactive = (v: boolean) => {
    const nextParams = new URLSearchParams(searchParams);
    if (v) nextParams.set("inactive", "1");
    else nextParams.delete("inactive");
    setSearchParams(nextParams, { replace: true });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const kanbanQuery = useQuery({
    queryKey: queryKeys.leads.list({ limit: 500, mode: "kanban" }),
    queryFn: () => fetchLeads({ limit: 500 }),
    enabled: view === "kanban",
  });

  const tableQuery = useQuery({
    queryKey: queryKeys.leads.list({
      limit: 500,
      mode: "table",
      status: statusFilter || undefined,
      include_inactive: includeInactive,
    }),
    queryFn: () =>
      fetchLeads({
        limit: 500,
        ...(statusFilter ? { status: statusFilter } : {}),
        include_inactive: includeInactive,
      }),
    enabled: view === "table",
  });

  const activeQuery = view === "kanban" ? kanbanQuery : tableQuery;

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const c of KANBAN_COLUMNS) map[c.id] = [];
    const list = kanbanQuery.data ?? [];
    for (const lead of list) {
      if (!lead.is_active) continue;
      const col = columnForLeadStatus(lead.status);
      if (col) map[col.id].push(lead);
    }
    return map;
  }, [kanbanQuery.data]);

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: LeadStatus }) =>
      updateLead(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const leadId = parseInt(String(active.id).replace(/^lead-/, ""), 10);
    const overId = String(over.id);
    if (!overId.startsWith("column-")) return;
    const colId = overId.replace(/^column-/, "");
    const col = KANBAN_COLUMNS.find((c) => c.id === colId);
    if (!col) return;
    const lead = kanbanQuery.data?.find((l) => l.id === leadId);
    if (lead && lead.status === col.targetStatus) return;
    moveMutation.mutate({ id: leadId, status: col.targetStatus });
  }

  if (activeQuery.isError) return <QueryError error={activeQuery.error} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Воронка</h1>
          <p className="text-sm text-ink-muted">
            {view === "kanban"
              ? "Перетаскивайте карточки между колонками"
              : "Таблица с фильтром по статусу"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-line p-0.5">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
                view === "kanban"
                  ? "bg-surface-muted text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Доска
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium",
                view === "table"
                  ? "bg-surface-muted text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              Таблица
            </button>
          </div>
          <Link
            to="/leads/new"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-accent px-2.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            <UserPlus className="h-4 w-4" />
            Новый клиент
          </Link>
        </div>
      </div>

      {view === "table" ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface-card p-3">
          <label className="block text-xs font-medium text-ink-muted">
            Статус
            <select
              className="mt-1 flex h-9 min-w-[200px] rounded-md border border-line bg-white px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
            >
              <option value="">Все статусы</option>
              {LEAD_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {formatLeadStatus(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded border-line"
            />
            <span className="text-xs">Показать неактивных</span>
          </label>
        </div>
      ) : null}

      {activeQuery.isPending ? (
        view === "kanban" ? (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-64 shrink-0" />
            ))}
          </div>
        ) : (
          <Skeleton className="h-64 w-full" />
        )
      ) : view === "kanban" ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumnView key={column.id} column={column} leads={grouped[column.id]} />
            ))}
          </div>
        </DndContext>
      ) : (
        <LeadsTableView leads={tableQuery.data ?? []} />
      )}
    </div>
  );
}
