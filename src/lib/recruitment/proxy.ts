import { apiOrigin, readBody } from "./http";

const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const tenant = `/tenants/${uuid}`;
const rules = [
  ["GET", "/me"],
  ["POST", "/tenants"],
  ["GET", tenant],
  ["GET", `${tenant}/overview`],
  ["GET", `${tenant}/openings`],
  ["POST", `${tenant}/openings`],
  ["GET", `${tenant}/openings/${uuid}`],
  ["PATCH", `${tenant}/openings/${uuid}`],
  ["POST", `${tenant}/openings/${uuid}/actions`],
  ["POST", `${tenant}/openings/${uuid}/criteria/retry`],
  ["GET", `${tenant}/openings/${uuid}/documents`],
  ["POST", `${tenant}/openings/${uuid}/documents`],
  ["GET", `${tenant}/openings/${uuid}/documents/${uuid}/file`],
  ["DELETE", `${tenant}/openings/${uuid}/documents/${uuid}`],
  ["POST", `${tenant}/openings/${uuid}/cv-uploads`],
  ["GET", `${tenant}/cv-uploads`],
  ["GET", `${tenant}/cv-uploads/${uuid}`],
  ["GET", `${tenant}/cv-uploads/${uuid}/file`],
  ["GET", `${tenant}/mailbox-providers`],
  ["GET", `${tenant}/mailboxes`],
  ["POST", `${tenant}/mailboxes`],
  ["POST", `${tenant}/mailboxes/imap`],
  ["POST", `${tenant}/mailboxes/${uuid}/imap-credentials`],
  ["GET", `${tenant}/mailboxes/${uuid}`],
  ["PATCH", `${tenant}/mailboxes/${uuid}`],
  ["DELETE", `${tenant}/mailboxes/${uuid}`],
  ["GET", `${tenant}/mailboxes/${uuid}/folders`],
  ["POST", `${tenant}/mailboxes/${uuid}/sync`],
  ["POST", "/mailbox-oauth/(gmail|microsoft)/callback"],
  ["GET", `${tenant}/mail-intake`],
  ["GET", `${tenant}/candidates`],
  ["GET", `${tenant}/candidates/${uuid}`],
  ["PATCH", `${tenant}/candidates/${uuid}`],
  ["GET", `${tenant}/candidates/${uuid}/resumes`],
  ["GET", `${tenant}/identity-reviews`],
  ["GET", `${tenant}/identity-reviews/${uuid}`],
  ["POST", `${tenant}/identity-reviews/${uuid}/resolve`],
  ["GET", `${tenant}/applications/${uuid}`],
  ["GET", `${tenant}/applications/${uuid}/match-results`],
  ["GET", `${tenant}/applications/${uuid}/role-assessments/${uuid}`],
  ["POST", `${tenant}/applications/${uuid}/review-decisions`],
  ["GET", `${tenant}/review-queue`],
  ["GET", `${tenant}/retention-settings`],
  ["PATCH", `${tenant}/retention-settings`],
  ["GET", `${tenant}/members`],
  ["POST", `${tenant}/members`],
  ["DELETE", `${tenant}/members/${uuid}`],
].map(([method, path]) => ({ method, pattern: new RegExp(`^${path}$`) }));

type ProxyOptions = {
  token: string | null;
  baseURL?: string;
  origin: string;
  fetcher?: typeof fetch;
};

function error(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// Only named business resources are reachable. Credentials stay on the server.
export async function forwardRecruitmentRequest(
  request: Request,
  segments: string[],
  options: ProxyOptions,
): Promise<Response> {
  if (!options.token)
    return error("UNAUTHENTICATED", "Sign in to continue.", 401);
  const path = `/${segments.join("/")}`;
  if (
    !rules.some(
      (rule) => rule.method === request.method && rule.pattern.test(path),
    )
  ) {
    return error("RESOURCE_NOT_FOUND", "This endpoint is not available.", 404);
  }
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== options.origin
  ) {
    return error(
      "ORIGIN_REJECTED",
      "Refresh this page before trying again.",
      403,
    );
  }
  if (!options.baseURL)
    return error(
      "API_UNAVAILABLE",
      "The backend is unavailable. Start the local stack and retry.",
      503,
    );
  let base: URL;
  try {
    base = apiOrigin(options.baseURL);
  } catch {
    return error(
      "API_UNAVAILABLE",
      "The backend address is not configured correctly.",
      503,
    );
  }
  const target = new URL(`/api/v1${path}`, base);
  const incoming = new URL(request.url);
  for (const key of incoming.searchParams.keys()) {
    if (
      !(
        path.endsWith("/overview")
          ? ["opening_id", "days"]
          : /\/openings$/.test(path)
            ? ["limit", "offset", "status"]
            : /\/documents\//.test(path)
              ? ["expected_revision"]
              : path.endsWith("/cv-uploads")
                ? ["limit", "offset", "opening_id"]
                : ["limit", "offset"]
      ).includes(key)
    )
      return error("INVALID_QUERY", "Unsupported query parameter.", 400);
  }
  target.search = incoming.search;
  const headers = new Headers({ Authorization: `Bearer ${options.token}` });
  const contentType = request.headers.get("content-type");
  const upload = request.method === "POST" && path.endsWith("/cv-uploads");
  const jobFiles =
    request.method === "POST" &&
    (path.endsWith("/openings") || path.endsWith("/documents")) &&
    /^multipart\/form-data;.*boundary=/i.test(contentType ?? "");
  if (request.method === "POST" || request.method === "PATCH") {
    if (
      !contentType ||
      !(
        upload || jobFiles
          ? /^multipart\/form-data;.*boundary=/i
          : /^application\/json(?:;|$)/i
      ).test(contentType)
    ) {
      return error(
        "UNSUPPORTED_MEDIA_TYPE",
        "Use JSON or a supported CV upload.",
        415,
      );
    }
    headers.set("content-type", contentType);
  }
  const key = request.headers.get("idempotency-key");
  if (key) headers.set("idempotency-key", key);
  try {
    const body =
      request.method === "GET"
        ? undefined
        : await readBody(
            request,
            jobFiles
              ? 51 * 1024 * 1024
              : upload
                ? 10 * 1024 * 1024 + 65536
                : path.includes("/openings")
                  ? 512 * 1024
                  : 65536,
          );
    const upstream = await (options.fetcher ?? fetch)(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(upload || jobFiles ? 60000 : 15000),
    });
    if (upstream.status === 204)
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    if (!upstream.headers.get("content-type")?.includes("application/json")) {
      const mime = upstream.headers.get("content-type")?.split(";")[0];
      const extensions: Record<string, string> = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "docx",
      };
      if (
        request.method === "GET" &&
        path.endsWith("/file") &&
        upstream.ok &&
        mime &&
        extensions[mime]
      ) {
        const bytes = await readBody(upstream, 10 * 1024 * 1024);
        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `attachment; filename="cv.${extensions[mime]}"`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
          },
        });
      }
      return error(
        "API_UNAVAILABLE",
        "The backend returned an unexpected response.",
        502,
      );
    }
    return Response.json(await upstream.json(), {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    if (cause instanceof RangeError)
      return error("FILE_TOO_LARGE", "Upload a CV no larger than 10 MB.", 413);
    return error(
      "API_UNAVAILABLE",
      "The backend could not be reached. Retry when it is running.",
      503,
    );
  }
}
