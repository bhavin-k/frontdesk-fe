import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

const email = `browser-${randomUUID()}@example.invalid`;
const password = "Browser-test-password-42!";

test.beforeAll(() => {
  const url = process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/recruitment_auth_test") {
    throw new Error("Run npm run db:test, then npm run test:e2e.");
  }
});

test.afterAll(async () => {
  const pool = new Pool({
    connectionString: process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL,
  });
  try {
    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  } finally {
    await pool.end();
  }
});

test("sign up without email verification, preserve the session, sign out and sign in", async ({
  page,
  context,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle("Frontdesk");
  await expect(page.getByText("Sign in to your Frontdesk account.")).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Recruitment Test");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Different-password!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "The passwords do not match.",
  );
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator("header:visible").getByText("Frontdesk", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create your Frontdesk workspace" }),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const publicSession = await (
    await page.request.get("/api/auth/get-session")
  ).json();
  expect(publicSession.session.token).toBeUndefined();
  const me = await (await page.request.get("/api/me")).json();
  expect(me.user.emailVerified).toBe(false);
  expect(me.user.email).toBe(email);
  expect(Object.keys(me)).toEqual(["user"]);
  const cookie = (await context.cookies()).find(
    (item) => item.name === "recruitment-bt.session_token",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Recruitment Test/ }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Incorrect-password!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "The email or password is incorrect.",
  );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("keeps login usable on a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
