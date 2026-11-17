import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createRecruitmentAuth } from "@/lib/auth/create-auth";
import { publicAuthResponse } from "@/lib/auth/public-response";

const databaseURL = process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL;
const baseURL = "http://localhost:3101";
const password = "Google-link-test-password-42!";
const users: string[] = [];
const states: string[] = [];
let pool: Pool;
let auth: ReturnType<typeof createRecruitmentAuth>;
let client = 0;
let identity: { email: string; sub: string; verified: boolean };

function cookies(response: Response) {
  return response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

async function request(path: string, body?: Record<string, unknown>, cookie = "", origin = baseURL) {
  return publicAuthResponse(await auth.handler(new Request(`${baseURL}/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", origin, cookie, "x-forwarded-for": `198.20.1.${++client}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })));
}

async function start(kind = "sign-in/social", cookie = "") {
  const response = await request(`/${kind}`, {
    provider: "google", callbackURL: "/dashboard", errorCallbackURL: "/login",
  }, cookie);
  expect(response.status).toBe(200);
  const url = new URL((await response.json()).url);
  const state = url.searchParams.get("state")!;
  states.push(state);
  return { url, state, cookie: [cookie, cookies(response)].filter(Boolean).join("; ") };
}

async function finish(flow: Awaited<ReturnType<typeof start>>, state = flow.state, cookie = flow.cookie) {
  return request(`/callback/google?${new URLSearchParams({ state, code: "local-unit-code" })}`, undefined, cookie);
}

async function passwordAccount() {
  const response = await request("/sign-up/email", { name: "Existing Recruiter", email: identity.email, password });
  expect(response.status).toBe(200);
  return { user: (await response.json()).user, cookie: cookies(response) };
}

async function accountRows(email = identity.email) {
  return (await pool.query(
    `SELECT a.*, u.email_verified FROM better_auth_accounts a JOIN users u ON u.id=a.user_id WHERE u.email=$1`,
    [email],
  )).rows;
}

describe.skipIf(!databaseURL)("Google identity with Better Auth and restricted PostgreSQL", () => {
  beforeAll(async () => {
    if (!databaseURL || new URL(databaseURL).pathname !== "/recruitment_auth_test") {
      throw new Error("Google auth tests require the dedicated recruitment_auth_test database.");
    }
    pool = new Pool({ connectionString: databaseURL });
    const role = (await pool.query("SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
    expect(role).toEqual({ current_user: "recruitment_auth", rolsuper: false, rolbypassrls: false });
    auth = createRecruitmentAuth(pool, {
      baseURL, databaseURL, secret: "google-test-auth-secret-more-than-thirty-two-characters", secureCookies: false,
      google: { clientId: "local-unit.apps.googleusercontent.com", clientSecret: "local-unit-only" },
    });
    const provider = (await auth.$context).socialProviders.find((item) => item.id === "google")!;
    // Test-only provider seam: state, PKCE, callbacks, hooks, sessions and DB writes stay real.
    provider.validateAuthorizationCode = async ({ code, codeVerifier, redirectURI }) => {
      expect(code).toBe("local-unit-code");
      expect(codeVerifier?.length).toBeGreaterThanOrEqual(43);
      expect(redirectURI).toBe(`${baseURL}/api/auth/callback/google`);
      return { accessToken: "local-access-token", refreshToken: "local-refresh-token", idToken: "local-id-token", scopes: ["openid", "email", "profile"] };
    };
    provider.getUserInfo = async () => ({
      user: { name: "Google Recruiter", email: identity.email, emailVerified: identity.verified },
      data: { sub: identity.sub },
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("External calls are blocked in Google auth tests."); });
  });

  beforeEach(() => {
    identity = { email: `google-${randomUUID()}@example.invalid`, sub: randomUUID(), verified: true };
    users.push(identity.email);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (!pool) return;
    await pool.query("DELETE FROM users WHERE email=ANY($1::text[])", [users]);
    await pool.query("DELETE FROM better_auth_verifications WHERE identifier=ANY($1::text[])", [states.map((state) => `auth-state:${state}`)]);
    await pool.end();
  });

  it("requests only identity permissions, PKCE and the configured callback", async () => {
    const { url } = await start();
    expect(url.origin).toBe("https://accounts.google.com");
    expect(new Set(url.searchParams.get("scope")!.split(" "))).toEqual(new Set(["openid", "email", "profile"]));
    expect(url.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/callback/google`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("include_granted_scopes")).toBeNull();
    expect(url.searchParams.get("access_type")).toBe("online");
  });

  it("creates a verified Google account and reuses it on later login without storing provider tokens", async () => {
    const response = await finish(await start());
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/\/dashboard$/);
    expect(cookies(response)).toContain("recruitment-bt.session_token=");
    const session = await (await request("/get-session", undefined, cookies(response))).json();
    expect(session.user.emailVerified).toBe(true);
    expect(session.session.token).toBeUndefined();
    const rows = await accountRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider_id: "google", account_id: identity.sub, access_token: null, refresh_token: null, id_token: null, password: null });
    const second = await finish(await start());
    const again = await (await request("/get-session", undefined, cookies(second))).json();
    expect(again.user.id).toBe(session.user.id);
    expect(await accountRows()).toHaveLength(1);
  });

  it("requires explicit linking for an existing password account and preserves its password", async () => {
    const existing = await passwordAccount();
    const response = await finish(await start());
    expect(response.headers.get("location")).toContain("account_not_linked");
    expect(await accountRows()).toHaveLength(1);
    const login = await request("/sign-in/email", { email: identity.email, password });
    expect((await login.json()).user.id).toBe(existing.user.id);
  });

  it("links the matching Google identity while signed in and retains the original user ID", async () => {
    const existing = await passwordAccount();
    const linked = await finish(await start("link-social", existing.cookie));
    expect(linked.headers.get("location")).toMatch(/\/dashboard$/);
    const rows = await accountRows();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.user_id === existing.user.id)).toBe(true);
    expect(rows.find((row) => row.provider_id === "google")).toMatchObject({ access_token: null, refresh_token: null, id_token: null });
    const response = await finish(await start());
    const session = await (await request("/get-session", undefined, cookies(response))).json();
    expect(session.user.id).toBe(existing.user.id);
    expect((await (await request("/sign-in/email", { email: identity.email, password })).json()).user.id).toBe(existing.user.id);
  });

  it("rejects signed-out linking and a Google identity with a different email", async () => {
    expect((await request("/link-social", { provider: "google", callbackURL: "/dashboard" })).status).toBe(401);
    const existing = await passwordAccount();
    const originalEmail = identity.email;
    identity.email = `different-${randomUUID()}@example.invalid`;
    users.push(identity.email);
    const response = await finish(await start("link-social", existing.cookie));
    expect(response.headers.get("location")).toContain("email_does_not_match");
    expect(await accountRows(originalEmail)).toHaveLength(1);
    expect(await accountRows()).toHaveLength(0);
  });

  it("rejects an unverified Google email", async () => {
    identity.verified = false;
    const response = await finish(await start());
    expect(response.headers.get("location")).toContain("google_email_not_verified");
    expect(await accountRows()).toHaveLength(0);
    expect((await pool.query("SELECT count(*)::int AS total FROM users WHERE email=$1", [identity.email])).rows[0].total).toBe(0);
  });

  it("rejects forged state, missing state cookies and replayed callbacks", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const flow = await start();
    expect((await finish(flow, "forged-state")).headers.get("location")).toContain("error=");
    expect((await finish(flow, flow.state, "")).headers.get("location")).toContain("error=");
    const fresh = await start();
    expect((await finish(fresh)).headers.get("location")).toMatch(/\/dashboard$/);
    expect((await finish(fresh)).headers.get("location")).toContain("error=");
    expect(await accountRows()).toHaveLength(1);
    expect(log).toHaveBeenCalledWith("Frontdesk authentication request failed.");
    expect(JSON.stringify(log.mock.calls)).not.toContain(fresh.state);
    log.mockRestore();
  });

  it("rejects expired OAuth state without creating a user", async () => {
    const flow = await start();
    const expired = await pool.query(
      "UPDATE better_auth_verifications SET expires_at=now()-interval '1 second', value=jsonb_set(value::jsonb, '{expiresAt}', to_jsonb($2::bigint))::text WHERE identifier=$1",
      [`auth-state:${flow.state}`, Date.now() - 1000],
    );
    expect(expired.rowCount).toBe(1);
    expect((await finish(flow)).headers.get("location")).toContain("error=");
    expect(await accountRows()).toHaveLength(0);
    expect((await pool.query("SELECT count(*)::int AS total FROM users WHERE email=$1", [identity.email])).rows[0].total).toBe(0);
  });

  it("keeps mailbox scopes and browser token exchange out of identity endpoints", async () => {
    for (const extra of [
      { scopes: ["https://www.googleapis.com/auth/gmail.readonly"] },
      { idToken: { token: "local-id-token" } },
      { additionalParams: { include_granted_scopes: "true" } },
    ]) {
      expect((await request("/sign-in/social", { provider: "google", callbackURL: "/dashboard", ...extra })).status).toBe(400);
    }
    expect((await request("/sign-in/social", { provider: "google", callbackURL: "https://untrusted.example" })).status).toBe(403);
    expect((await request("/sign-in/social", { provider: "google", callbackURL: "/dashboard" }, "", "https://untrusted.example")).status).toBe(403);
  });
});
