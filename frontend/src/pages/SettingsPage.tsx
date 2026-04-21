import { useState } from "react";

import { CalendarExportPanel } from "@/widgets/calendar-export/CalendarExportPanel";

export function SettingsPage() {
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Настройки</h1>
        <p className="text-sm text-ink-muted">Экспорт задач и напоминаний в Google Календарь</p>
      </div>

      {banner ? (
        <p className="rounded-md border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
          {banner}
        </p>
      ) : null}

      <CalendarExportPanel onMessage={setBanner} />
    </div>
  );
}
