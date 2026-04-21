import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { queryKeys } from "@/shared/api/query-keys";
import { createLead, ApiError } from "@/services/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

function telegramUsernameFromUrl(url: string): string | null {
  const m = url.trim().match(/(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]+)/i);
  return m ? m[1] : null;
}

function deriveFullName(numberRaw: string, profileUrl: string | null): string {
  const u = telegramUsernameFromUrl(profileUrl ?? "");
  if (u) return `@${u}`;
  const n = numberRaw.trim();
  if (n) return n;
  const p = (profileUrl ?? "").trim();
  if (p) return p;
  return "Клиент";
}

export function LeadCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [numberInput, setNumberInput] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  const createMut = useMutation({
    mutationFn: () => {
      const raw = numberInput.trim();
      const url = emptyToNull(profileUrl);
      const allDigits = raw !== "" && /^\d+$/.test(raw);
      const telegram_id =
        allDigits ? parseInt(raw, 10) : null;
      const phone = allDigits ? null : emptyToNull(raw);
      const username = url ? telegramUsernameFromUrl(url) : null;
      return createLead({
        full_name: deriveFullName(raw, url),
        username: username ? username.replace(/^@+/, "") : null,
        telegram_id,
        phone,
        profile_url: url,
        status: "new",
        is_active: true,
      });
    },
    onSuccess: async (lead) => {
      setError(null);
      await qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      navigate(`/leads/${lead.id}`);
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? e.message : "Не удалось создать клиента");
    },
  });

  const canSubmit = numberInput.trim() !== "" || profileUrl.trim() !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Воронка
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold text-ink">Новый клиент</h1>
        <p className="text-sm text-ink-muted">
          Номер (телефон или Telegram ID) и ссылка на профиль — остальное можно на карточке
          клиента.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Контакт</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="number">Номер</Label>
            <Input
              id="number"
              className="mt-1"
              inputMode="tel"
              value={numberInput}
              onChange={(e) => setNumberInput(e.target.value)}
              placeholder="Телефон или только цифры Telegram ID"
            />
          </div>
          <div>
            <Label htmlFor="profile_url">Ссылка</Label>
            <Input
              id="profile_url"
              className="mt-1"
              type="url"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://t.me/…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={!canSubmit || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Создать клиента
        </Button>
        <Link
          to="/leads"
          className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-surface-muted px-3 text-sm font-medium text-ink hover:bg-line/40"
        >
          Отмена
        </Link>
      </div>
    </div>
  );
}
