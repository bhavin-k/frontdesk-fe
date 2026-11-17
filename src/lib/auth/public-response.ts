const privateKeys = new Set([
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "access_token",
  "refresh_token",
  "id_token",
]);

function publicValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(publicValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !privateKeys.has(key))
        .map(([key, child]) => [key, publicValue(child)]),
    );
  return value;
}

export async function publicAuthResponse(
  response: Response,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("Cache-Control", "no-store");
  const init = { status: response.status, headers };
  // Better Auth can label its empty OAuth redirects as JSON.
  if ((response.status >= 300 && response.status < 400) || response.body === null)
    return new Response(null, init);
  if (!headers.get("content-type")?.includes("application/json"))
    return new Response(response.body, init);
  const body = await response.text();
  return new Response(body.trim() ? JSON.stringify(publicValue(JSON.parse(body))) : null, {
    status: response.status,
    headers,
  });
}
