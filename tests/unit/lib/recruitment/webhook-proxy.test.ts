import { describe, expect, it, vi } from "vitest";
import { forwardMailboxWebhook } from "@/lib/recruitment/webhook-proxy";

const publicOrigin = "https://recruitment.example";
const options = { baseURL: "http://127.0.0.1:8000" };
const id = "00000000-0000-0000-0000-000000000001";
const request = (
  suffix = "gmail",
  body = "{}",
  headers: Record<string, string> = {},
) =>
  new Request(`${publicOrigin}/api/v1/mailbox-webhooks/${suffix}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });

describe("public mailbox notification bridge", () => {
  it("preserves provider authentication and raw bytes while stripping browser credentials", async () => {
    const body = JSON.stringify({
      message: { data: "opaque", messageId: "receipt" },
    });
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(null, {
          status: 202,
          headers: { "set-cookie": "private=discard" },
        }),
      );
    const response = await forwardMailboxWebhook(
      request("gmail", body, {
        authorization: "Bearer provider-jwt",
        cookie: "browser-session=private",
        "x-tenant-id": id,
      }),
      ["gmail"],
      { ...options, fetcher },
    );
    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
    expect(response.headers.has("set-cookie")).toBe(false);
    const [target, init] = fetcher.mock.calls[0];
    expect(target.href).toBe(
      "http://127.0.0.1:8000/api/v1/mailbox-webhooks/gmail",
    );
    expect(new TextDecoder().decode(init.body)).toBe(body);
    expect(init.headers.get("authorization")).toBe("Bearer provider-jwt");
    expect(init.headers.has("cookie")).toBe(false);
    expect(init.headers.has("x-tenant-id")).toBe(false);
    expect(init.redirect).toBe("error");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps provider verification in FastAPI and propagates rejected notifications", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: "INVALID_NOTIFICATION" } },
          { status: 401 },
        ),
      );
    const response = await forwardMailboxWebhook(request(), ["gmail"], {
      ...options,
      fetcher,
    });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("INVALID_NOTIFICATION");
  });

  it.each([
    ["tenants", id],
    ["gmail", "extra"],
    ["microsoft", "invalid"],
    ["https://other.invalid"],
    ["..", "auth"],
  ])(
    "rejects paths outside the notification allowlist: %s",
    async (...path) => {
      const fetcher = vi.fn();
      expect(
        (await forwardMailboxWebhook(request(), path, { ...options, fetcher }))
          .status,
      ).toBe(404);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("forwards the Microsoft validation challenge without requiring a browser session", async () => {
    const token = "validation & ? + value";
    const query = new URLSearchParams({ validationToken: token });
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(token, { headers: { "content-type": "text/plain" } }),
      );
    const response = await forwardMailboxWebhook(
      new Request(
        `${publicOrigin}/api/v1/mailbox-webhooks/microsoft/${id}?${query}`,
        { method: "POST" },
      ),
      ["microsoft", id],
      { ...options, fetcher },
    );
    expect(await response.text()).toBe(token);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(fetcher.mock.calls[0][0].searchParams.get("validationToken")).toBe(
      token,
    );
  });

  it.each([
    "gmail?tenant_id=other",
    `microsoft/${id}?redirect=https://other.invalid`,
  ])("rejects ownership and arbitrary query parameters: %s", async (suffix) => {
    const fetcher = vi.fn();
    const path = suffix.split("?")[0].split("/");
    expect(
      (
        await forwardMailboxWebhook(request(suffix), path, {
          ...options,
          fetcher,
        })
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("bounds streamed bodies before forwarding", async () => {
    const fetcher = vi.fn();
    expect(
      (
        await forwardMailboxWebhook(
          request("gmail", "x".repeat(65537)),
          ["gmail"],
          { ...options, fetcher },
        )
      ).status,
    ).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires JSON for ordinary notifications and POST delivery", async () => {
    const fetcher = vi.fn();
    expect(
      (
        await forwardMailboxWebhook(
          request("gmail", "{}", { "content-type": "text/plain" }),
          ["gmail"],
          { ...options, fetcher },
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await forwardMailboxWebhook(
          new Request(`${publicOrigin}/api/v1/mailbox-webhooks/gmail`),
          ["gmail"],
          { ...options, fetcher },
        )
      ).status,
    ).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    "file:///private",
    "http://user:private@localhost",
    "http://localhost/private",
  ])("rejects unsafe backend configuration: %s", async (baseURL) => {
    const fetcher = vi.fn();
    expect(
      (await forwardMailboxWebhook(request(), ["gmail"], { baseURL, fetcher }))
        .status,
    ).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sanitizes upstream transport failures", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error("private upstream details"));
    const response = await forwardMailboxWebhook(request(), ["gmail"], {
      ...options,
      fetcher,
    });
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private upstream");
  });
});
