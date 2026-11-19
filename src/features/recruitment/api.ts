export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  return (await apiWithStatus<T>(path, init, signal)).data;
}

export async function apiWithStatus<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<{ data: T; status: number }> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string")
    headers.set("content-type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/recruitment${path}`, {
      ...init,
      headers,
      signal,
      cache: "no-store",
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw new ApiError(
      "Connection lost. Check that the local stack is running and retry.",
      503,
      "CONNECTION_LOST",
    );
  }
  let payload;
  try {
    payload = response.status === 204 ? undefined : await response.json();
  } catch {
    throw new ApiError(
      "The service returned an incomplete response. Retry shortly.",
      response.status >= 400 ? response.status : 502,
      "INVALID_RESPONSE",
    );
  }
  if (!response.ok)
    throw new ApiError(
      payload?.error?.message ?? "The request could not be completed.",
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
    );
  return { data: payload as T, status: response.status };
}

export const tenantPath = (id: string) => `/tenants/${encodeURIComponent(id)}`;
export const recruitmentQueryKey = (userId: string, base: string | null, path: string) =>
  ["recruitment", userId, base, path] as const;
export const candidatePagePath = (offset = 0) => `/candidates?limit=20&offset=${offset}`;
export const isProcessing = (status: string) =>
  !["completed", "needs_review"].includes(status);
export const displayTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
