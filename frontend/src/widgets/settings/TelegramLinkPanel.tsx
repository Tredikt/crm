import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { UserMe } from "@/shared/api/auth";
import { updateMeRequest } from "@/shared/api/auth";
import { ApiError } from "@/shared/api/http";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

type Props = {
  user: UserMe;
  onMessage: (msg: string) => void;
};

export function TelegramLinkPanel({ user, onMessage }: Props) {
  const qc = useQueryClient();
  const [telegramId, setTelegramId] = useState(
    user.telegram_user_id != null ? String(user.telegram_user_id) : "",
  );

  const saveMut = useMutation({
    mutationFn: () => {
      const raw = telegramId.trim();
      const value = raw ? parseInt(raw, 10) : null;
      if (raw && !Number.isFinite(value)) throw new Error("Укажите числовой Telegram ID");
      return updateMeRequest({ telegram_user_id: value });
    },
    onSuccess: async () => {
      onMessage("Telegram ID сохранён. Бот будет показывать ваши данные.");
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (e: unknown) => {
      onMessage(e instanceof ApiError ? e.message : "Не удалось сохранить");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram-бот</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-ink-muted">
          Укажите ваш числовой Telegram ID (узнать: @userinfobot). При одном пользователе CRM бот
          может привязаться автоматически по команде /start.
        </p>
        {user.telegram_user_id ? (
          <p className="text-sm text-ink">
            Привязано: <strong>{user.telegram_user_id}</strong>
          </p>
        ) : null}
        <Input
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          placeholder="Например: 123456789"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            Сохранить
          </Button>
          {user.telegram_user_id ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={saveMut.isPending}
              onClick={() => {
                setTelegramId("");
                updateMeRequest({ telegram_user_id: null })
                  .then(() => onMessage("Привязка Telegram снята"))
                  .catch((e) => onMessage(e instanceof Error ? e.message : "Ошибка"));
              }}
            >
              Отвязать
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
