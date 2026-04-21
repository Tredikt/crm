import { ApiError } from "@/services/api";

export function QueryError({ error }: { error: unknown }) {
  const msg =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Ошибка загрузки";
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {msg}
    </div>
  );
}
