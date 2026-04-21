import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import {
  fetchCalendarExportStatus,
  regenerateCalendarExportToken,
} from "@/shared/api/calendar-export";
import { QueryError } from "@/widgets/query-error/QueryError";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";

const EXPORT_QUERY = ["calendar-export", "status"] as const;

function displayUrl(data: { feed_url_absolute: string | null; feed_url_relative: string }) {
  if (data.feed_url_absolute) return data.feed_url_absolute;
  const vite = import.meta.env.VITE_PUBLIC_API_URL as string | undefined;
  if (vite?.trim()) return `${vite.replace(/\/$/, "")}${data.feed_url_relative}`;
  return `${window.location.origin}${data.feed_url_relative}`;
}

export function CalendarExportPanel({ onMessage }: { onMessage: (msg: string) => void }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const q = useQuery({ queryKey: EXPORT_QUERY, queryFn: fetchCalendarExportStatus });
  const regen = useMutation({
    mutationFn: regenerateCalendarExportToken,
    onSuccess: async () => {
      onMessage("Создан новый секрет. Обновите ссылку в Google Календарь.");
      await qc.invalidateQueries({ queryKey: EXPORT_QUERY });
    },
  });

  const url = useMemo(() => (q.data ? displayUrl(q.data) : ""), [q.data]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    onMessage("Ссылка скопирована в буфер обмена.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (q.isError) return <QueryError error={q.error} />;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Экспорт в Google Календарь</CardTitle>
        <Button
          size="sm"
          variant="secondary"
          disabled={regen.isPending}
          onClick={() => regen.mutate()}
        >
          {regen.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Новый секрет
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-ink-muted">
        <p>
          Скопируйте ссылку и в Google Календаре выберите{" "}
          <strong className="text-ink">«+» → «Из URL»</strong> (или настройки календаря →
          добавить по ссылке). Обновления с сервера Google подтягивает с задержкой (часто до
          суток).
        </p>
        <p className="text-xs">{q.data?.hint}</p>
        {q.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input readOnly className="font-mono text-xs" value={url} />
            <Button type="button" variant="primary" size="sm" className="shrink-0" onClick={copy}>
              <Copy className="h-4 w-4" />
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>
        )}
        <p className="text-xs">
          В ленте: открытые <strong className="text-ink">задачи со сроком</strong>,{" "}
          <strong className="text-ink">следующий шаг лида</strong> (текст + время), активные{" "}
          <strong className="text-ink">проекты с дедлайном</strong> (не завершённые/не отменённые).
        </p>
      </CardContent>
    </Card>
  );
}
