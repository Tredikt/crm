import { useState } from "react";

import { useOutletContext } from "react-router-dom";

import type { AppOutletContext } from "@/app/router";
import { CalendarExportPanel } from "@/widgets/calendar-export/CalendarExportPanel";
import { ImportExportPanel } from "@/widgets/settings/ImportExportPanel";
import { TelegramLinkPanel } from "@/widgets/settings/TelegramLinkPanel";
import { TagsManagerPanel } from "@/widgets/tags/TagsManagerPanel";

export function SettingsPage() {
  const { user } = useOutletContext<AppOutletContext>();
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Настройки</h1>
        <p className="text-sm text-ink-muted">Telegram, теги, экспорт календаря и CSV</p>
      </div>

      {banner ? (
        <p className="rounded-md border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
          {banner}
        </p>
      ) : null}

      <TelegramLinkPanel user={user} onMessage={setBanner} />
      <TagsManagerPanel />
      <ImportExportPanel onMessage={setBanner} />
      <CalendarExportPanel onMessage={setBanner} />
    </div>
  );
}
