import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import type { Lead, LeadStatus } from "@/entities/lead/types";
import { formatLeadStatus, LEAD_STATUS_ORDER } from "@/entities/lead/status-labels";
import { queryKeys } from "@/shared/api/query-keys";
import { updateLead } from "@/services/api";
import { formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

export function LeadsTableView({ leads }: { leads: Lead[] }) {
  const qc = useQueryClient();
  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: LeadStatus }) =>
      updateLead(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  });

  if (leads.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface-muted/30 px-4 py-8 text-center text-sm text-ink-muted">
        Нет лидов по выбранным условиям
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-muted/50 text-xs font-medium text-ink-muted">
            <th className="px-3 py-2.5 font-medium">Имя</th>
            <th className="px-3 py-2.5 font-medium">Статус</th>
            <th className="px-3 py-2.5 font-medium">Телефон</th>
            <th className="px-3 py-2.5 font-medium">Источник</th>
            <th className="px-3 py-2.5 font-medium">След. шаг</th>
            <th className="px-3 py-2.5 font-medium">Обновлён</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className={cn(
                "border-b border-line last:border-b-0 hover:bg-surface-muted/30",
                !lead.is_active && "opacity-60",
              )}
            >
              <td className="px-3 py-2.5">
                <Link
                  to={`/leads/${lead.id}`}
                  className="font-medium text-ink hover:text-accent hover:underline"
                >
                  {lead.full_name}
                </Link>
                <div className="text-xs text-ink-muted">#{lead.id}</div>
              </td>
              <td className="px-3 py-2.5">
                <select
                  className="max-w-[200px] rounded-md border border-line bg-white px-2 py-1 text-xs"
                  value={lead.status}
                  disabled={patchStatus.isPending}
                  onChange={(e) =>
                    patchStatus.mutate({
                      id: lead.id,
                      status: e.target.value as LeadStatus,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  {LEAD_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {formatLeadStatus(s)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2.5 text-ink-muted">{lead.phone ?? "—"}</td>
              <td className="px-3 py-2.5 text-ink-muted">{lead.source ?? "—"}</td>
              <td className="max-w-[200px] px-3 py-2.5">
                <div className="truncate text-ink-muted" title={lead.next_action ?? undefined}>
                  {lead.next_action ?? "—"}
                </div>
                <div className="text-xs text-ink-muted">
                  {formatDateTime(lead.next_action_at)}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">
                {formatDateTime(lead.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
