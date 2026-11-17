import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test, type Page } from "@playwright/test";

const users: string[] = [];
const password = "Google-browser-password-42!";
const hydrationWarnings = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const warnings: string[] = [];
  hydrationWarnings.set(page, warnings);
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat(?:ion|ed)/i.test(message.text())) warnings.push(message.text());
  });
});

test.afterEach(({ page }) => {
  expect(hydrationWarnings.get(page)).toEqual([]);
});

test.beforeAll(() => {
  if (new URL(process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL ?? "http://invalid").pathname !== "/recruitment_auth_test") {
    throw new Error("Google browser tests require the dedicated test database.");
  }
});

test.afterAll(async () => {
  const pool = new Pool({ connectionString: process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL });
  try { await pool.query("DELETE FROM users WHERE email=ANY($1::text[])", [users]); }
  finally { await pool.end(); }
});

function identity() {
  const id = randomUUID();
  const email = `google-browser-${id}@example.invalid`;
  users.push(email);
  return { email, sub: `local-e2e-${id}` };
}

async function fakeGoogle(page: Page, user: ReturnType<typeof identity>, cancel = false) {
  await page.route("https://accounts.google.com/**", async (route) => {
    const url = new URL(route.request().url());
    expect(new Set(url.searchParams.get("scope")!.split(" "))).toEqual(new Set(["openid", "email", "profile"]));
    expect(url.searchParams.has("include_granted_scopes")).toBe(false);
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    expect(callback.origin).toBe("http://localhost:3102");
    expect(callback.pathname).toBe("/api/auth/callback/google");
    callback.searchParams.set("state", url.searchParams.get("state")!);
    if (cancel) callback.searchParams.set("error", "access_denied");
    else callback.searchParams.set("code", Buffer.from(JSON.stringify({
      ...user, challenge: url.searchParams.get("code_challenge"), redirectURI: callback.origin + callback.pathname,
    })).toString("base64url"));
    await route.fulfill({ status: 302, headers: { location: callback.href }, body: "" });
  });
  // No test browser request may reach a real external service.
  await page.route("**/*", async (route) => {
    const host = new URL(route.request().url()).hostname;
    if (["localhost", "127.0.0.1", "accounts.google.com"].includes(host)) await route.fallback();
    else await route.abort("blockedbyclient");
  });
}

async function signOut(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("Google signup and subsequent login use the same account and private session", async ({ page, context }) => {
  const user = identity();
  await fakeGoogle(page, user);
  await page.goto("/dashboard/settings/account");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/auth/list-accounts")).status()).toBe(401);
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 });
  await expect(page.getByRole("heading", { name: "Create your Frontdesk workspace" })).toBeVisible();
  const first = await (await page.request.get("/api/me")).json();
  expect(first.user.email).toBe(user.email);
  expect(first.user.emailVerified).toBe(true);
  const backend = await (await page.request.get("/api/recruitment/me")).json();
  expect(backend.memberships).toEqual([]);
  const session = await (await page.request.get("/api/auth/get-session")).json();
  expect(session.session.token).toBeUndefined();
  expect((await context.cookies()).find((cookie) => cookie.name === "recruitment-bt.session_token")?.httpOnly).toBe(true);
  await signOut(page, "Google Browser Recruiter");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 });
  expect((await (await page.request.get("/api/me")).json()).user.id).toBe(first.user.id);
});

test("a password account explicitly links Google before using Google login", async ({ page }) => {
  test.setTimeout(120000);
  const user = identity();
  await fakeGoogle(page, user);
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Existing Browser Recruiter");
  await page.getByLabel("Email address", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 });
  const original = await (await page.request.get("/api/me")).json();
  await signOut(page, "Existing Browser Recruiter");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?error=account_not_linked/);
  await expect(page.locator("form").getByRole("alert")).toContainText("Sign in with your password");
  await page.getByLabel("Email address", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 });
  await page.getByRole("button", { name: /Existing Browser Recruiter/ }).click();
  await page.getByRole("menuitem", { name: "Account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\/account$/);
  await page.getByRole("button", { name: "Link Google", exact: true }).click();
  await expect(page.getByText("Google is linked to this account.", { exact: true })).toBeVisible();
  await signOut(page, "Existing Browser Recruiter");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60000 });
  expect((await (await page.request.get("/api/me")).json()).user.id).toBe(original.user.id);
});

test("mobile Google cancellation keeps the password form usable and hides provider error details", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeGoogle(page, identity(), true);
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?error=access_denied/);
  await expect(page.locator("form").getByRole("alert")).toContainText("Google sign-in was cancelled.");
  await expect(page.getByLabel("Email address", { exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/login?error=untrusted-provider-text&error_description=do-not-display-this");
  await expect(page.locator("form").getByRole("alert")).toContainText("Google sign-in could not complete.");
  await expect(page.getByText("do-not-display-this")).toHaveCount(0);
});
