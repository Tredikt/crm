import { useState } from "react";

import {
  exportDealsCsv,
  exportLeadsCsv,
  importDealsCsv,
  importLeadsCsv,
} from "@/shared/api/import-export";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type Props = {
  onMessage: (msg: string) => void;
};

export function ImportExportPanel({ onMessage }: Props) {
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Ошибка операции");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Импорт / экспорт CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => exportLeadsCsv())}>
            Экспорт лидов
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => exportDealsCsv())}>
            Экспорт сделок
          </Button>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-ink-muted">
            Импорт лидов (CSV: full_name, phone, status, …)
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              className="mt-1 block w-full text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await run(async () => {
                  const res = await importLeadsCsv(file);
                  onMessage(`Импортировано лидов: ${res.created}`);
                });
                e.target.value = "";
              }}
            />
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            Импорт сделок (CSV: lead_id, title, amount, status, …)
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              className="mt-1 block w-full text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await run(async () => {
                  const res = await importDealsCsv(file);
                  onMessage(`Импортировано сделок: ${res.created}`);
                });
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
