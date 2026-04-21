import { apiRequest } from "@/shared/api/http";

export type CalendarExportStatus = {
  feed_url_relative: string;
  feed_url_absolute: string | null;
  hint: string;
};

export type CalendarExportRegenerate = {
  token: string;
  feed_url_relative: string;
  feed_url_absolute: string | null;
};

export function fetchCalendarExportStatus() {
  return apiRequest<CalendarExportStatus>("/calendar-export/status");
}

export function regenerateCalendarExportToken() {
  return apiRequest<CalendarExportRegenerate>("/calendar-export/regenerate", {
    method: "POST",
  });
}
