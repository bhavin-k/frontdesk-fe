import { describe, expect, it, vi } from "vitest";
import { forwardRecruitmentRequest } from "@/lib/recruitment/proxy";

const id = "00000000-0000-0000-0000-000000000001";
const origin = "http://localhost:3100";
const options = {
  token: "local-test-session",
  origin,
  baseURL: "http://127.0.0.1:8000",
};
const request = (path = "/me", init: RequestInit = {}) =>
  new Request(`${origin}/api/recruitment${path}`, init);

describe("private recruitment API bridge", () => {
  it.each([
    ["POST", `tenants/${id}/openings/${id}/actions`],
    ["PATCH", `tenants/${id}/openings/${id}`],
    ["POST", `tenants/${id}/openings/${id}/criteria/retry`],
  ])(
    "forwards the explicit opening %s route with server authorization",
    async (method, path) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(Response.json({ status: "paused" }));
      const response = await forwardRecruitmentRequest(
        request(`/${path}`, {
          method,
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({ expected_revision: 1 }),
        }),
        path.split("/"),
        { ...options, fetcher },
      );
      expect(response.status).toBe(200);
      expect(
        new Headers(fetcher.mock.calls[0][1].headers).get("authorization"),
      ).toBe(`Bearer ${options.token}`);
    },
  );

  it("allows status filters only on opening lists", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [] }));
    const response = await forwardRecruitmentRequest(
      request(`/tenants/${id}/openings?status=paused`),
      ["tenants", id, "openings"],
      { ...options, fetcher },
    );
    expect(response.status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("status=paused");
    const rejected = await forwardRecruitmentRequest(
      request(`/tenants/${id}/candidates?status=paused`),
      ["tenants", id, "candidates"],
      { ...options, fetcher },
    );
    expect(rejected.status).toBe(400);
  });

  it("forwards supporting files through the bounded multipart opening route", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ id }, { status: 201 }));
    const body = new FormData();
    body.set(
      "payload",
      JSON.stringify({
        title: "Python",
        job_description: "Python development",
      }),
    );
    body.append(
      "files",
      new Blob(["fictional job document"], { type: "application/pdf" }),
      "job.pdf",
    );
    const response = await forwardRecruitmentRequest(
      request(`/tenants/${id}/openings`, {
        method: "POST",
        headers: { origin },
        body,
      }),
      ["tenants", id, "openings"],
      { ...options, fetcher },
    );
    expect(response.status).toBe(201);
    expect(
      new Headers(fetcher.mock.calls[0][1].headers).get("content-type"),
    ).toContain("multipart/form-data");
  });

  it.each([
    ["tenants", id, "mailboxes", "imap"],
    ["tenants", id, "mailboxes", id, "imap-credentials"],
  ])(
    "forwards only the explicit IMAP credential routes through the server session: %s",
    async (...segments) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          Response.json({ id, connection_method: "imap" }, { status: 201 }),
        );
      const response = await forwardRecruitmentRequest(
        request(`/${segments.join("/")}`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({ app_password: "test".repeat(4) }),
        }),
        segments,
        { ...options, fetcher },
      );
      expect(response.status).toBe(201);
      expect(await response.text()).not.toContain("testtest");
      expect(fetcher).toHaveBeenCalledOnce();
      expect(fetcher.mock.calls[0][1].headers.get("Authorization")).toBe(
        "Bearer local-test-session",
      );
    },
  );
  it("requires an authenticated session before contacting the API", async () => {
    const fetcher = vi.fn();
    expect(
      (
        await forwardRecruitmentRequest(request(), ["me"], {
          ...options,
          token: null,
          fetcher,
        })
      ).status,
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["http://untrusted.invalid", null])(
    "rejects unsafe mutation origins: %s",
    async (value) => {
      const fetcher = vi.fn();
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (value) headers.origin = value;
      expect(
        (
          await forwardRecruitmentRequest(
            request("/tenants", { method: "POST", headers, body: "{}" }),
            ["tenants"],
            { ...options, fetcher },
          )
        ).status,
      ).toBe(403);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["auth", "sessions"],
    ["..", "auth"],
    ["tenants", id, "anything"],
    ["tenants", "invalid", "openings"],
    ["http:", "evil.invalid"],
  ])("only forwards approved resource paths: %s", async (...segments) => {
    const fetcher = vi.fn();
    expect(
      (
        await forwardRecruitmentRequest(request(), segments, {
          ...options,
          fetcher,
        })
      ).status,
    ).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("supplies the server session and preserves API errors without caching", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: "RESOURCE_NOT_FOUND", message: "Not found." } },
          { status: 404 },
        ),
      );
    const response = await forwardRecruitmentRequest(
      request(`/tenants/${id}/openings?limit=20&offset=0`, {
        headers: {
          authorization: "Bearer attacker",
          cookie: "secret=do-not-forward",
        },
      }),
      ["tenants", id, "openings"],
      { ...options, fetcher },
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetcher.mock.calls[0];
    expect(url.href).toBe(
      `http://127.0.0.1:8000/api/v1/tenants/${id}/openings?limit=20&offset=0`,
    );
    expect(init.headers.get("authorization")).toBe("Bearer local-test-session");
    expect(init.headers.has("cookie")).toBe(false);
    expect(init.redirect).toBe("error");
  });

  it("forwards multipart CVs and their idempotency key", async () => {
    const form = new FormData();
    form.append("file", new Blob(["sample"]), "sample.pdf");
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ upload_id: id }, { status: 202 }));
    const response = await forwardRecruitmentRequest(
      request("/upload", {
        method: "POST",
        body: form,
        headers: { origin, "idempotency-key": "upload-retry-key" },
      }),
      ["tenants", id, "openings", id, "cv-uploads"],
      { ...options, fetcher },
    );
    expect(response.status).toBe(202);
    expect(fetcher.mock.calls[0][1].headers.get("idempotency-key")).toBe(
      "upload-retry-key",
    );
    expect(fetcher.mock.calls[0][1].headers.get("content-type")).toContain(
      "multipart/form-data;",
    );
  });

  it("enforces a streamed body limit even without Content-Length", async () => {
    const fetcher = vi.fn();
    const response = await forwardRecruitmentRequest(
      request("/tenants", {
        method: "POST",
        body: JSON.stringify({ data: "x".repeat(65536) }),
        headers: { origin, "content-type": "application/json" },
      }),
      ["tenants"],
      { ...options, fetcher },
    );
    expect(response.status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("handles unavailable services and refuses unsafe configuration", async () => {
    for (const baseURL of [
      undefined,
      "file:///secrets",
      "http://name:secret@localhost",
      "http://localhost/private",
    ]) {
      expect(
        (
          await forwardRecruitmentRequest(request(), ["me"], {
            ...options,
            baseURL,
          })
        ).status,
      ).toBe(503);
    }
    const fetcher = vi.fn().mockRejectedValue(new Error("network failed"));
    const response = await forwardRecruitmentRequest(request(), ["me"], {
      ...options,
      fetcher,
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("local-test-session");
  });

  it("rejects unknown query parameters and unsupported bodies", async () => {
    expect(
      (
        await forwardRecruitmentRequest(
          request("/me?url=http://evil.invalid"),
          ["me"],
          options,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await forwardRecruitmentRequest(
          request("/tenants", {
            method: "POST",
            headers: { origin, "content-type": "text/plain" },
            body: "hello",
          }),
          ["tenants"],
          options,
        )
      ).status,
    ).toBe(415);
  });
});
