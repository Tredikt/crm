import { useMemo, useState } from "react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function normalizeWords(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const h = haystack.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

export function SearchablePicker<T>({
  label,
  value,
  onChange,
  items,
  getId,
  getSearchText,
  getDisplayLabel,
  isLoading,
  placeholder = "Поиск…",
  noneLabel = "Не выбрано",
  emptyListHint = "Ничего не найдено",
  className,
}: {
  label: string;
  value: T | null;
  onChange: (item: T | null) => void;
  items: T[];
  getId: (item: T) => string | number;
  getSearchText: (item: T) => string;
  getDisplayLabel: (item: T) => string;
  isLoading?: boolean;
  placeholder?: string;
  noneLabel?: string;
  emptyListHint?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");

  const tokens = useMemo(() => normalizeWords(query), [query]);

  const filtered = useMemo(() => {
    return items.filter((item) => matchesTokens(getSearchText(item), tokens));
  }, [items, tokens, getSearchText]);

  const selectedKey = value != null ? getId(value) : null;

  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
      />
      {value ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="truncate font-medium text-ink">{getDisplayLabel(value)}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            Сбросить
          </Button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">{noneLabel}</p>
      )}
      <div
        className={cn(
          "mt-2 max-h-48 overflow-y-auto rounded-md border border-line bg-white",
          "text-sm shadow-sm",
        )}
        role="listbox"
        aria-label={label}
      >
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-ink-muted">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-muted">{emptyListHint}</p>
        ) : (
          <ul className="divide-y divide-line py-0.5">
            {filtered.map((item) => {
              const selected = selectedKey !== null && selectedKey === getId(item);
              return (
                <li key={String(getId(item))}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-ink transition-colors",
                      "hover:bg-surface-muted",
                      selected && "bg-accent/10",
                    )}
                    onClick={() => {
                      onChange(item);
                      setQuery("");
                    }}
                  >
                    {getDisplayLabel(item)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
