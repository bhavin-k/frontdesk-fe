import { recruitmentRequest } from "@/lib/recruitment-api";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const base = new URL(process.env.APP_BASE_URL ?? "http://localhost:3100");
  const destination = new URL("/dashboard/integrations", base);
  const incoming = new URL(request.url);
  let business: string | undefined;
  if (!["gmail", "microsoft"].includes(provider)) {
    return new Response(null, { status: 404 });
  }
  const state = incoming.searchParams.get("state");
  if (!state || state.length < 32 || state.length > 512) {
    destination.searchParams.set("mailbox", "authorization_failed");
  } else {
    const response = await recruitmentRequest(
      new Request(
        new URL(`/api/recruitment/mailbox-oauth/${provider}/callback`, base),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: base.origin },
          body: JSON.stringify({
            state,
            code: incoming.searchParams.get("code"),
            error: incoming.searchParams.get("error"),
          }),
        },
      ),
      ["mailbox-oauth", provider, "callback"],
    );
    destination.searchParams.set(
      "mailbox",
      response.ok ? "authorized" : "authorization_failed",
    );
    if (response.ok) {
      const row = await response.json();
      if (
        typeof row.tenant_id === "string" &&
        /^[0-9a-f-]{36}$/i.test(row.tenant_id)
      ) {
        destination.searchParams.set("business", row.tenant_id);
        business = row.tenant_id;
      }
    }
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination.toString(),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...(business
        ? {
            "Set-Cookie": `recruitment-business=${business}; Path=/; Max-Age=31536000; SameSite=Lax${base.protocol === "https:" ? "; Secure" : ""}`,
          }
        : {}),
    },
  });
}
