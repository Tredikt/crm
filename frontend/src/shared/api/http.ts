/** Префикс API (в dev обычно /api/v1 через proxy Vite). */
export const API_V1_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

const API_BASE = API_V1_BASE;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const h = new Headers(headers);
  if (json !== undefined) {
    h.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    const body = await parseJson<{ detail?: string }>(res);
    const msg =
      typeof body?.detail === "string"
        ? body.detail
        : `HTTP ${res.status} ${res.statusText}`;
    throw new ApiError(msg, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}
