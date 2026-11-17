import { apiOrigin, readBody } from "./http";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Options = { baseURL?: string; fetcher?: typeof fetch };
function error(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Public provider delivery only. FastAPI verifies provider identity before resolving ownership. */
export async function forwardMailboxWebhook(
  request: Request,
  path: string[],
  options: Options,
): Promise<Response> {
  const gmail = path.length === 1 && path[0] === "gmail";
  const microsoft =
    path.length === 2 && path[0] === "microsoft" && uuid.test(path[1]);
  if (!gmail && !microsoft)
    return error("RESOURCE_NOT_FOUND", "This endpoint is not available.", 404);
  if (request.method !== "POST")
    return error(
      "METHOD_NOT_ALLOWED",
      "Use POST for provider notifications.",
      405,
    );
  const incoming = new URL(request.url);
  for (const key of incoming.searchParams.keys()) {
    if (
      !microsoft ||
      key !== "validationToken" ||
      incoming.searchParams.getAll(key).length !== 1 ||
      (incoming.searchParams.get(key)?.length ?? 0) > 512
    ) {
      return error("INVALID_QUERY", "Unsupported notification query.", 400);
    }
  }
  const validation = microsoft && incoming.searchParams.has("validationToken");
  if (
    !validation &&
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    return error(
      "UNSUPPORTED_MEDIA_TYPE",
      "Use a JSON provider notification.",
      415,
    );
  }
  let target: URL;
  try {
    target = new URL(
      `/api/v1/mailbox-webhooks/${path.join("/")}`,
      apiOrigin(options.baseURL ?? ""),
    );
    target.search = incoming.search;
  } catch {
    return error(
      "API_UNAVAILABLE",
      "The notification backend is not configured.",
      503,
    );
  }
  try {
    const body = await readBody(request, 65536);
    // Forward only provider authentication. Browser sessions and cookies never reach this route.
    const headers = new Headers();
    for (const name of ["authorization", "content-type"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await (options.fetcher ?? fetch)(target, {
      method: "POST",
      body,
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const responseHeaders = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    };
    if (upstream.status === 204)
      return new Response(null, { status: 204, headers: responseHeaders });
    return new Response(await readBody(upstream, 65536), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (cause) {
    if (cause instanceof RangeError)
      return error("NOTIFICATION_SIZE", "Notification exceeds its limit.", 413);
    return error(
      "API_UNAVAILABLE",
      "The notification backend is unavailable.",
      502,
    );
  }
}
