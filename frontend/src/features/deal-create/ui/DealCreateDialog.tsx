import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Deal, DealStatus } from "@/entities/deal/types";
import {
  DEAL_STATUS_OPTIONS,
  defaultProbabilityForStatus,
  formatDealStatus,
} from "@/entities/deal/labels";
import { fetchLeads } from "@/services/api";
import { queryKeys } from "@/shared/api/query-keys";
import { createDeal, createDealForLead } from "@/shared/api/deals";
import { ApiError } from "@/shared/api/http";
import { fromDatetimeLocalValue } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixedLeadId?: number;
  onCreated?: (deal: Deal) => void;
};

export function DealCreateDialog({
  open,
  onOpenChange,
  fixedLeadId,
  onCreated,
}: Props) {
  const qc = useQueryClient();
  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.list({ limit: 400 }),
    queryFn: () => fetchLeads({ limit: 400 }),
    enabled: open && fixedLeadId == null,
  });

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [status, setStatus] = useState<DealStatus>("qualification");
  const [probability, setProbability] = useState(10);
  const [expectedClose, setExpectedClose] = useState("");
  const [comment, setComment] = useState("");
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle("");
    setAmount("");
    setCurrency("RUB");
    setStatus("qualification");
    setProbability(10);
    setExpectedClose("");
    setComment("");
    if (fixedLeadId != null) {
      setLeadId(String(fixedLeadId));
    } else {
      setLeadId("");
    }
  }, [open, fixedLeadId]);

  useEffect(() => {
    setProbability(defaultProbabilityForStatus(status));
  }, [status]);

  const mutate = useMutation({
    mutationFn: async () => {
      const parsedAmount = amount.trim() ? parseFloat(amount.replace(",", ".")) : 0;
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error("Укажите корректную сумму");
      }
      const body = {
        title: title.trim(),
        amount: parsedAmount,
        currency: currency.trim() || "RUB",
        status,
        probability,
        expected_close_date: expectedClose ? fromDatetimeLocalValue(expectedClose) : null,
        comment: comment.trim() || null,
      };
      if (fixedLeadId != null) {
        return createDealForLead(fixedLeadId, body);
      }
      const lid = parseInt(leadId, 10);
      if (!Number.isFinite(lid)) {
        throw new Error("Выберите лида");
      }
      return createDeal({ lead_id: lid, ...body });
    },
    onSuccess: async (deal) => {
      await qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      if (fixedLeadId != null) {
        await qc.invalidateQueries({ queryKey: queryKeys.deals.byLead(fixedLeadId) });
      }
      onOpenChange(false);
      onCreated?.(deal);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof Error) setError(e.message);
      else setError("Не удалось создать сделку");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Новая сделка">
      <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto pr-1">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div>
          <Label>Название</Label>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Разработка сайта"
          />
        </div>
        {fixedLeadId == null ? (
          <div>
            <Label>Лид</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              disabled={leadsQuery.isPending}
            >
              <option value="">— выберите —</option>
              {(leadsQuery.data ?? []).map((l) => (
                <option key={l.id} value={String(l.id)}>
                  #{l.id} {l.full_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Лид #{fixedLeadId} — из карточки клиента</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Сумма</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Валюта</Label>
            <Input
              className="mt-1"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Этап</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-line bg-white px-2 text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value as DealStatus)}
            >
              {DEAL_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatDealStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Вероятность, %</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
        <div>
          <Label>Ожидаемое закрытие</Label>
          <Input
            type="datetime-local"
            className="mt-1"
            value={expectedClose}
            onChange={(e) => setExpectedClose(e.target.value)}
          />
        </div>
        <div>
          <Label>Комментарий</Label>
          <Textarea
            className="mt-1 min-h-[48px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <Button
          className="w-full"
          variant="primary"
          disabled={!title.trim() || mutate.isPending}
          onClick={() => {
            setError(null);
            mutate.mutate();
          }}
        >
          Создать сделку
        </Button>
      </div>
    </Dialog>
  );
}
