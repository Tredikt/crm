import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeys } from "@/shared/api/query-keys";
import { createTag, fetchTags } from "@/shared/api/tags";
import { ApiError } from "@/shared/api/http";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";

export function TagsManagerPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: fetchTags,
  });

  const createMut = useMutation({
    mutationFn: () => createTag({ name: name.trim() }),
    onSuccess: async () => {
      setName("");
      setError(null);
      await qc.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? e.message : "Не удалось создать тег");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Теги</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-ink-muted">
          Создавайте теги и назначайте их на карточках лидов. Фильтр по тегам — на странице воронки.
        </p>
        <div className="flex flex-wrap gap-2">
          {(tagsQuery.data ?? []).map((t) => (
            <Badge key={t.id} tone="neutral">
              {t.name}
            </Badge>
          ))}
          {(tagsQuery.data?.length ?? 0) === 0 ? (
            <span className="text-sm text-ink-muted">Тегов пока нет</span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Новый тег"
            className="flex-1"
          />
          <Button
            variant="primary"
            disabled={!name.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Добавить
          </Button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
