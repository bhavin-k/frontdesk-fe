import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRecruitmentAuth } from "@/lib/auth/create-auth";

const databaseURL = process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL;
const apiURL = process.env.RECRUITMENT_API_TEST_DATABASE_URL;
const baseURL = "http://localhost:3101";
const password = "Test-password-for-recruitment-42!";
const users: string[] = [];
let pool: Pool;
let auth: ReturnType<typeof createRecruitmentAuth>;
let client = 0;
const runSegment = Math.floor(Math.random() * 200) + 1;

function request(
  path: string,
  body?: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
) {
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        origin: baseURL,
        "x-forwarded-for": `198.18.${runSegment}.${++client}`,
        ...extraHeaders,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

async function signUp() {
  const email = `auth-${randomUUID()}@example.invalid`;
  users.push(email);
  const response = await request("/sign-up/email", {
    name: "Test Operator",
    email,
    password,
  });
  expect(response.status).toBe(200);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const data = await response.json();
  return { email, response, cookie, data };
}

describe.skipIf(!databaseURL)(
  "Better Auth with the restricted PostgreSQL role",
  () => {
    beforeAll(async () => {
      if (
        !databaseURL ||
        new URL(databaseURL).pathname !== "/recruitment_auth_test"
      ) {
        throw new Error(
          "Auth integration tests require the dedicated recruitment_auth_test database.",
        );
      }
      pool = new Pool({ connectionString: databaseURL });
      const role = (
        await pool.query(
          "SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
        )
      ).rows[0];
      expect(role).toEqual({
        current_user: "recruitment_auth",
        rolsuper: false,
        rolbypassrls: false,
      });
      auth = createRecruitmentAuth(pool, {
        baseURL,
        databaseURL,
        secret: "test-secret-with-more-than-thirty-two-characters",
        secureCookies: false,
      });
    });

    afterAll(async () => {
      if (!pool) return;
      await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
        users,
      ]);
      await pool.end();
    });

    it("signs up without verification, hashes the password and sets a session cookie", async () => {
      const { response, data, email, cookie } = await signUp();
      expect(data.user.emailVerified).toBe(false);
      expect(data.token).toBeTruthy();
      expect(response.headers.getSetCookie().join(" ")).toMatch(/HttpOnly/i);
      expect(response.headers.getSetCookie().join(" ")).toMatch(
        /SameSite=Lax/i,
      );
      const account = (
        await pool.query(
          "SELECT password FROM better_auth_accounts WHERE user_id = $1",
          [data.user.id],
        )
      ).rows[0];
      expect(account.password).toBeTruthy();
      expect(account.password).not.toBe(password);
      const session = await (
        await request("/get-session", undefined, { cookie })
      ).json();
      expect(session.user.email).toBe(email);
      expect(
        new Date(session.session.expiresAt).getTime() - Date.now(),
      ).toBeGreaterThan(29 * 86400 * 1000);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM better_auth_verifications WHERE identifier = $1",
            [email],
          )
        ).rows[0].count,
      ).toBe(0);
    });

    it("accepts the password on login and rejects an incorrect password", async () => {
      const { email } = await signUp();
      expect(
        (
          await request("/sign-in/email", {
            email,
            password: "Incorrect-password!",
          })
        ).status,
      ).toBe(401);
      const response = await request("/sign-in/email", {
        email: email.toUpperCase(),
        password,
      });
      expect(response.status).toBe(200);
      expect((await response.json()).user.email).toBe(email);
    });

    it("rejects weak passwords and duplicate accounts", async () => {
      const email = `weak-${randomUUID()}@example.invalid`;
      users.push(email);
      expect(
        (
          await request("/sign-up/email", {
            name: "Test",
            email,
            password: "short",
          })
        ).status,
      ).toBe(400);
      const user = await signUp();
      const duplicate = await request("/sign-up/email", {
        name: "Another",
        email: user.email.toUpperCase(),
        password,
      });
      expect(duplicate.status).toBeGreaterThanOrEqual(400);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM users WHERE lower(email) = $1",
            [user.email],
          )
        ).rows[0].count,
      ).toBe(1);
    });

    it("invalidates a session on logout, including replay of its old cookie", async () => {
      const { cookie } = await signUp();
      expect((await request("/sign-out", {}, { cookie })).status).toBe(200);
      expect(
        await (await request("/get-session", undefined, { cookie })).json(),
      ).toBeNull();
    });

    it("rejects expired and forged sessions", async () => {
      const { cookie, data } = await signUp();
      await pool.query(
        "UPDATE better_auth_sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1",
        [data.user.id],
      );
      expect(
        await (await request("/get-session", undefined, { cookie })).json(),
      ).toBeNull();
      expect(
        await (
          await request("/get-session", undefined, {
            cookie: "recruitment-bt.session_token=forged.invalid",
          })
        ).json(),
      ).toBeNull();
    });

    it("rejects cross-origin requests", async () => {
      users.push("cross-origin@example.invalid");
      const response = await request(
        "/sign-up/email",
        {
          name: "Test",
          email: "cross-origin@example.invalid",
          password,
        },
        { origin: "https://untrusted.example" },
      );
      expect(response.status).toBe(403);
    });

    it("uses secure HTTP-only cookies and the configured origin behind an HTTPS tunnel", async () => {
      const tunnel = "https://recruitment.example";
      const httpsAuth = createRecruitmentAuth(pool, {
        baseURL: tunnel,
        databaseURL: databaseURL!,
        secret: "test-secret-with-more-than-thirty-two-characters",
        secureCookies: true,
      });
      const email = `tunnel-${randomUUID()}@example.invalid`;
      users.push(email);
      const response = await httpsAuth.handler(
        new Request(`${tunnel}/api/auth/sign-up/email`, {
          method: "POST",
          headers: {
            origin: tunnel,
            "content-type": "application/json",
            "x-forwarded-for": `198.19.${runSegment}.249`,
          },
          body: JSON.stringify({ name: "Tunnel Test", email, password }),
        }),
      );
      expect(response.status).toBe(200);
      const cookies = response.headers.getSetCookie();
      expect(cookies.join(";")).toMatch(/Secure/i);
      expect(cookies.join(";")).toMatch(/HttpOnly/i);
      const session = await httpsAuth.handler(
        new Request(`${tunnel}/api/auth/get-session`, {
          headers: {
            cookie: cookies.map((value) => value.split(";")[0]).join("; "),
          },
        }),
      );
      expect((await session.json()).user.email).toBe(email);
    });

    it("persists and enforces login rate limits", async () => {
      const headers = { "x-forwarded-for": `198.19.${runSegment}.250` };
      for (let attempt = 0; attempt < 5; attempt++) {
        expect(
          (
            await request(
              "/sign-in/email",
              { email: "missing@example.invalid", password },
              headers,
            )
          ).status,
        ).toBe(401);
      }
      expect(
        (
          await request(
            "/sign-in/email",
            { email: "missing@example.invalid", password },
            headers,
          )
        ).status,
      ).toBe(429);
    });

    it("enforces forced RLS on auth tables and denies the application role access to passwords", async () => {
      const tables = (
        await pool.query(
          "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1::text[])",
          [
            [
              "users",
              "better_auth_accounts",
              "better_auth_sessions",
              "better_auth_verifications",
              "better_auth_rate_limits",
            ],
          ],
        )
      ).rows;
      expect(tables).toHaveLength(5);
      expect(
        tables.every(
          (table) => table.relrowsecurity && table.relforcerowsecurity,
        ),
      ).toBe(true);
      if (!apiURL || new URL(apiURL).pathname !== "/recruitment_auth_test")
        throw new Error("Set RECRUITMENT_API_TEST_DATABASE_URL.");
      const api = new Pool({ connectionString: apiURL });
      try {
        await expect(
          api.query("SELECT password FROM better_auth_accounts"),
        ).rejects.toMatchObject({ code: "42501" });
      } finally {
        await api.end();
      }
    });
  },
);
