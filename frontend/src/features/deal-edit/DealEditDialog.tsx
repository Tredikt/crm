import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Deal, DealStatus } from "@/entities/deal/types";
import {
  DEAL_STATUS_OPTIONS,
  defaultProbabilityForStatus,
  formatDealStatus,
} from "@/entities/deal/labels";
import { isTerminalDealStatus } from "@/entities/deal/lib";
import { queryKeys } from "@/shared/api/query-keys";
import { deleteDeal, updateDeal } from "@/shared/api/deals";
import { ApiError } from "@/shared/api/http";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

type Props = {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DealEditDialog({ deal, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [status, setStatus] = useState<DealStatus>("qualification");
  const [probability, setProbability] = useState(10);
  const [expectedClose, setExpectedClose] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deal || !open) return;
    setTitle(deal.title);
    setAmount(String(deal.amount));
    setCurrency(deal.currency);
    setStatus(deal.status);
    setProbability(deal.probability);
    setExpectedClose(toDatetimeLocalValue(deal.expected_close_date));
    setComment(deal.comment ?? "");
    setError(null);
  }, [deal, open]);

  const mutate = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("Сделка не выбрана");
      const parsedAmount = parseFloat(amount.replace(",", "."));
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error("Укажите корректную сумму");
      }
      return updateDeal(deal.id, {
        title: title.trim(),
        amount: parsedAmount,
        currency: currency.trim() || "RUB",
        status,
        probability,
        expected_close_date: expectedClose ? fromDatetimeLocalValue(expectedClose) : null,
        comment: comment.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      if (deal) {
        await qc.invalidateQueries({ queryKey: queryKeys.deals.byLead(deal.lead_id) });
      }
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) setError(e.message);
      else if (e instanceof Error) setError(e.message);
      else setError("Не удалось сохранить сделку");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("Сделка не выбрана");
      await deleteDeal(deal.id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.deals.all });
      if (deal) {
        await qc.invalidateQueries({ queryKey: queryKeys.deals.byLead(deal.lead_id) });
      }
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) setError(e.message);
      else setError("Не удалось удалить сделку");
    },
  });

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Сделка #${deal.id}`}>
      <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto pr-1">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div>
          <Label>Название</Label>
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
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
              onChange={(e) => {
                const next = e.target.value as DealStatus;
                setStatus(next);
                if (isTerminalDealStatus(next)) {
                  setProbability(defaultProbabilityForStatus(next));
                }
              }}
              disabled={isTerminalDealStatus(deal.status)}
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
              disabled={isTerminalDealStatus(status)}
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
            disabled={isTerminalDealStatus(status)}
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            variant="primary"
            disabled={!title.trim() || mutate.isPending}
            onClick={() => {
              setError(null);
              mutate.mutate();
            }}
          >
            Сохранить
          </Button>
          <Button
            variant="secondary"
            disabled={deleteMut.isPending}
            onClick={() => {
              if (window.confirm("Архивировать сделку?")) {
                setError(null);
                deleteMut.mutate();
              }
            }}
          >
            В архив
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
