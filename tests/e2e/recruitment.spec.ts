import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
const origin = "http://localhost:3102";
const fixture = (name: string) =>
  resolve(import.meta.dirname, "fixtures", name);
const testClientIP = () =>
  `198.18.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
test.beforeEach(async ({ context }) => {
  // Each isolated browser represents a separate client; production auth limits stay enabled.
  await context.setExtraHTTPHeaders({ "x-forwarded-for": testClientIP() });
});
async function signup(page: Page, name = "Local Recruiter") {
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill(name);
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`hiring-${randomUUID()}@example.invalid`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Local-browser-test-password-42!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Local-browser-test-password-42!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function business(page: Page, name: string) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/recruitment/tenants") &&
      r.request().method() === "POST",
  );
  await page.getByLabel("Business name", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Create business", exact: true })
    .click();
  const created = await (await response).json();
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  return created.id as string;
}
async function opening(page: Page) {
  await page.locator('a[href="/dashboard/openings"]').first().click();
  await page.locator('a[href="/dashboard/openings/new"]').first().click();
  await page.getByLabel("Job title", { exact: true }).fill("Python Developer");
  await page
    .getByLabel("Job description", { exact: true })
    .fill("Build Python backend APIs and PostgreSQL data models.");

  await page
    .getByRole("button", { name: "Create opening", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/openings\/[0-9a-f-]{36}$/);
  return page.url().split("/").at(-1)!;
}
async function upload(page: Page, id: string, file: string, status = 202) {
  await page.goto(`/dashboard/openings/${id}`);
  await page
    .getByLabel("CV file", { exact: true })
    .setInputFiles(fixture(file));
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/cv-uploads") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Upload and process", exact: true })
    .click();
  const result = await response;
  expect(result.status()).toBe(status);
  const value = await result.json();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/review/${value.upload_id}`),
  );
  return value;
}

test("review explains citation failures instead of reporting a document error", async ({ page }) => {
  test.setTimeout(150000);
  await signup(page, "Evidence review recruiter");
  const tenant = await business(page, "Evidence review test");
  const role = await opening(page);
  const uploaded = await upload(page, role, "sample-cv.pdf");
  await page.route(`**/api/recruitment/tenants/${tenant}/cv-uploads/${uploaded.upload_id}`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        status: "needs_review",
        application_id: null,
        review_reason: "INVALID_EVIDENCE",
      },
    });
  });
  await page.goto(`/dashboard/review/${uploaded.upload_id}`);
  await expect(page.getByText(
    "The AI's evidence could not be verified against this CV. No match score was published.",
    { exact: false },
  )).toBeVisible();
  await expect(page.getByText(/Document processing could not be completed/)).toHaveCount(0);
});

test("PDF attachments: preserve the original and show matched CV evidence", async ({ page }) => {
  test.setTimeout(150000);
  await signup(page, "PDF test recruiter");
  const tenant = await business(page, "PDF processing test");
  const role = await opening(page);
  const uploaded = await upload(page, role, "sample-cv-with-attachment.pdf");
  await expect(page.getByTestId("upload-status")).toHaveText("Processed", {
    timeout: 45000,
  });
  await expect(page.locator("blockquote").first()).toContainText("Python");
  const base = `/api/recruitment/tenants/${tenant}`;
  const original = await page.request.get(`${base}/cv-uploads/${uploaded.upload_id}/file`);
  expect(original.status()).toBe(200);
  expect(await original.body()).toEqual(await readFile(fixture("sample-cv-with-attachment.pdf")));
  expect(original.headers()["content-disposition"]).toContain("attachment");
  const status = await (await page.request.get(`${base}/cv-uploads/${uploaded.upload_id}`)).json();
  const matched = await (
    await page.request.get(`${base}/applications/${status.application_id}/match-results`)
  ).json();
  expect(matched.result.score).toBe(100);
  expect(matched.result.criteria[0].evidence.length).toBeGreaterThan(0);
});

test("dashboard: CV evidence, real counts, corrections, rejection confirmation, membership and isolation", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  await signup(page);
  const tenant = await business(page, "Recruitment browser test");
  const role = await opening(page);
  const base = `/api/recruitment/tenants/${tenant}`;
  const first = await upload(page, role, "sample-cv.docx");
  await expect(page.getByTestId("upload-status")).toHaveText("Processed", {
    timeout: 45000,
  });
  await expect(page.locator("blockquote").first()).toContainText(
    "Python development",
  );
  const fileStatus = await (
    await page.request.get(`${base}/cv-uploads/${first.upload_id}`)
  ).json();
  const application = await (
    await page.request.get(`${base}/applications/${fileStatus.application_id}`)
  ).json();
  const candidateId = application.candidate_id;
  const original = await page.request.get(
    `${base}/cv-uploads/${first.upload_id}/file`,
  );
  expect(original.status()).toBe(200);
  expect(await original.body()).toEqual(
    await readFile(fixture("sample-cv.docx")),
  );
  expect(original.headers()["content-disposition"]).toContain("attachment");
  await upload(page, role, "sample-cv.docx", 200);
  expect(
    (await (await page.request.get(`${base}/cv-uploads`)).json()).items,
  ).toHaveLength(1);
  await page.goto(`/dashboard/candidates/${candidateId}`);
  await page
    .getByRole("tab", { name: "Candidate profile", exact: true })
    .click();
  const corrected = `reviewed-${randomUUID()}@example.org`;
  await page.getByLabel("Candidate email", { exact: true }).fill(corrected);
  await page
    .getByLabel("Reason for this change", { exact: true })
    .fill("Corrected candidate email after reviewing the CV.");
  await page
    .getByRole("button", { name: "Save contact correction", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`${base}/candidates/${candidateId}`)
          ).json()
        ).profile.email,
    )
    .toBe(corrected);
  await page.goto(`/dashboard/review/${first.upload_id}`);
  await expect(page.locator("blockquote").first()).toBeVisible();
  const match = (
    await (
      await page.request.get(
        `${base}/applications/${application.id}/match-results`,
      )
    ).json()
  ).result;
  const refused = await page.request.post(
    `${base}/applications/${application.id}/review-decisions`,
    {
      headers: { Origin: origin, "Idempotency-Key": randomUUID() },
      data: {
        match_run_id: match.match_run_id,
        decision: "reject",
        confirm_rejection: false,
        reason: "A confirmation is required.",
      },
    },
  );
  expect(refused.status()).toBe(422);
  await page.getByLabel("Decision", { exact: true }).selectOption("reject");
  await expect(page.getByLabel("Recruiter reason", { exact: true })).toHaveCount(0);
  const save = page.getByRole("button", {
    name: "Save recruiter decision",
    exact: true,
  });
  await expect(save).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I reviewed the evidence and confirm this rejection",
      exact: true,
    })
    .check();
  await save.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  expect(
    (await (await page.request.get(`${base}/overview`)).json()).totals.rejected,
  ).toBe(0);
  await page
    .getByRole("button", { name: "Confirm rejection", exact: true })
    .click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByTestId("metric-cvs_received")).toHaveText("1");
  await expect(page.getByTestId("metric-rejected")).toHaveText("1");
  await expect(page.locator(".recharts-wrapper")).toBeVisible();
  await page.goto("/dashboard/settings/retention");
  await page
    .getByLabel("Days for other candidate workflows", { exact: true })
    .fill("45");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`${base}/retention-settings`)).json())
          .other_candidate_retention_days,
    )
    .toBe(45);
  const stranger = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": testClientIP() },
  });
  const membersUrl = `${origin}${base}/members`;
  const listStarted = Promise.withResolvers<void>();
  const releaseList = Promise.withResolvers<void>();
  try {
    const registration = await stranger.request.post(
      `${origin}/api/auth/sign-up/email`,
      {
        headers: { Origin: origin },
        data: {
          name: "Other Recruiter",
          email: `other-${randomUUID()}@example.invalid`,
          password: "Other-browser-password-42!",
        },
      },
    );
    expect(registration.ok()).toBe(true);
    for (const path of [
      `candidates/${candidateId}`,
      `cv-uploads/${first.upload_id}/file`,
      "overview",
    ])
      expect(
        (await stranger.request.get(`${origin}${base}/${path}`)).status(),
      ).toBe(404);
    const me = await (
      await stranger.request.get(`${origin}/api/recruitment/me`)
    ).json();
    let memberSaved = false;
    await page.route(membersUrl, async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const response = await route.fetch();
        memberSaved = response.status() === 201;
        await route.fulfill({ response });
      } else if (method === "GET" && !memberSaved) {
        listStarted.resolve();
        await releaseList.promise;
        // The page may have cancelled the intercepted read while it was paused.
        await route.abort().catch((cause: unknown) => {
          if (
            !(cause instanceof Error) ||
            !cause.message.includes("Route is already handled")
          ) {
            throw cause;
          }
        });
      } else {
        await route.continue();
      }
    });
    await page.goto("/dashboard/settings/team");
    await listStarted.promise;
    await page
      .getByLabel("Registered account ID", { exact: true })
      .fill(me.user_id);
    await page
      .getByRole("button", { name: "Add recruiter", exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name: me.user_id, exact: true }),
    ).toBeVisible();
    expect(
      (await stranger.request.get(`${origin}${base}/overview`)).status(),
    ).toBe(200);
  } finally {
    releaseList.resolve();
    await page.unroute(membersUrl);
    await stranger.close();
  }
  await page
    .getByRole("button", { name: "Switch business", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Add a business", exact: true })
    .click();
  await business(page, "Second recruitment business");
  await expect(page.getByTestId("metric-cvs_received")).toHaveText("0");
  await page.locator('a[href="/dashboard/candidates"]').first().click();
  await expect(
    page.getByText("No candidates yet", { exact: true }),
  ).toBeVisible();
});

test("mailbox setup, failure review and mobile screening navigation", async ({
  page,
}) => {
  test.setTimeout(180000);
  await signup(page, "Mailbox Recruiter");
  const tenant = await business(page, "Mailbox browser test");
  const role = await opening(page);
  const base = `/api/recruitment/tenants/${tenant}`;
  await page.goto("/dashboard/integrations");
  await expect(page.getByText(/Fake mailbox mode:/)).toBeVisible();
  for (const button of ["Connect Gmail", "Connect Outlook"]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page).toHaveURL(
      /\/dashboard\/integrations\?mailbox=authorized/,
    );
    const card = page
      .getByTestId("mailbox-card")
      .filter({ hasText: "Collection has not started" });
    await expect(card).toBeVisible();
    const mailboxId = await card.getAttribute("data-mailbox-id");
    await card
      .getByRole("button", {
        name: "Confirm folder and start collection",
        exact: true,
      })
      .click();
    const connected = page.locator(`[data-mailbox-id="${mailboxId}"]`);
    await expect(
      connected.getByText("Connected", { exact: true }),
    ).toBeVisible();
    await expect(
      connected.getByText(/Collecting messages received from/),
    ).toBeVisible();
    await connected
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    await expect(
      connected.getByText("Disconnected", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
  }
  await page
    .getByRole("button", {
      name: "Connect Gmail with IMAP (testing)",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Gmail address", { exact: true })
    .fill(`imap-test-${randomUUID()}@gmail.com`);
  await page
    .getByLabel("Google App Password", { exact: true })
    .fill("test".repeat(4));
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const imapRequest = page.waitForResponse(
    (response) =>
      response.url().endsWith("/mailboxes/imap") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Verify IMAP connection", exact: true })
    .click();
  const imapResponse = await imapRequest;
  expect(imapResponse.status()).toBe(201);
  const imapMailbox = await imapResponse.json();
  expect(imapMailbox.connection_method).toBe("imap");
  expect(imapMailbox).not.toHaveProperty("app_password");
  const imapCard = page.locator(`[data-mailbox-id="${imapMailbox.id}"]`);
  await imapCard
    .getByRole("button", {
      name: "Confirm folder and start collection",
      exact: true,
    })
    .click();
  await expect(imapCard.getByText("Connected", { exact: true })).toBeVisible();
  await imapCard
    .getByRole("button", { name: "Check for new email", exact: true })
    .click();
  await imapCard
    .getByRole("button", { name: "Disconnect", exact: true })
    .click();
  await expect(imapCard.getByText("Disconnected", { exact: true })).toBeVisible(
    { timeout: 30000 },
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  const failure = await upload(page, role, "review-needed.docx");
  await expect(page.getByTestId("upload-status")).toHaveText("Needs review", {
    timeout: 45000,
  });
  await expect(
    page.getByText(/A processing failure does not reject the candidate/),
  ).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`${base}/cv-uploads/${failure.upload_id}`)
      ).json()
    ).status,
  ).toBe("needs_review");
  await upload(page, role, "sample-cv.pdf");
  await expect(page.getByTestId("upload-status")).toHaveText("Processed", {
    timeout: 45000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Toggle sidebar", exact: true })
    .click();
  await page.locator('a[href="/dashboard/interviews"]').last().click();
  await expect(
    page.getByText("No screening interviews have been scheduled.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Toggle sidebar", exact: true })
    .click();
  await page.locator('a[href="/dashboard/screening-calls"]').last().click();
  await expect(
    page.getByText("No screening calls have been placed.", { exact: true }),
  ).toBeVisible();
});

test("unconfigured email and invitation screens explain their limits", async ({
  page,
}) => {
  for (const path of ["/forgot-password", "/verify-email", "/accept-invite"]) {
    await page.goto(path);
    await expect(
      page.getByText(/not configured|not enabled yet/),
    ).toBeVisible();
  }
  await page.goto("/reset-password");
  await expect(
    page.getByText("This link is missing or invalid.", { exact: true }),
  ).toBeVisible();
});
