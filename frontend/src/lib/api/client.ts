/** Thin fetch wrapper. All requests go to same-origin /api/v1 (proxied to FastAPI). */

const BASE = "/api/v1";

/** Mirrors the backend error body: {"error": {code, message, fields, ...extra}}. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> | null = null,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: { ...(json !== undefined && { "Content-Type": "application/json" }), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection.");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const {
      code = "http_error",
      message = `Request failed (${res.status})`,
      fields = null,
      ...extra
    } = body?.error ?? {};
    throw new ApiError(res.status, code, message, fields, extra);
  }
  return body as T;
}
