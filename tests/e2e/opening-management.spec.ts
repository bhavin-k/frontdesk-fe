import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const jobFile = fileURLToPath(
  new URL("./fixtures/python-job-description.pdf", import.meta.url),
);
const origin = "http://localhost:3102";

test.beforeEach(async ({ context }) => {
  // Isolated browser clients retain the production authentication rate limits.
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `198.18.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
  });
});

async function business(page: Page) {
  const registered = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: {
      name: "Job setup recruiter",
      email: `jobs-${randomUUID()}@example.invalid`,
      password: `Recruiter-${randomUUID()}!`,
    },
  });
  expect(registered.status()).toBe(200);
  const created = await page.request.post("/api/recruitment/tenants", {
    headers: { origin },
    data: { name: `Hiring team ${randomUUID().slice(0, 8)}` },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).id as string;
}

for (const mobile of [false, true]) {
  test(`${mobile ? "mobile" : "desktop"}: create and manage openings without scoring settings`, async ({
    page,
  }) => {
    test.setTimeout(150000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const tenant = await business(page);
    const title = `Python Developer ${randomUUID().slice(0, 8)}`;
    await page.goto("/dashboard/openings/new");
    await expect(page.getByLabel("Job title", { exact: true })).toBeVisible({
      timeout: 60000,
    });
    await expect(
      page.getByLabel(/weight|threshold|strict condition|criterion 1/i),
    ).toHaveCount(0);
    await page.getByLabel("Job title", { exact: true }).fill(title);
    await page
      .getByLabel("Job description", { exact: true })
      .fill("Build Python APIs. PostgreSQL experience is preferred.");
    if (!mobile) {
      await page.getByLabel("Department", { exact: true }).fill("Engineering");
      await page
        .getByLabel("Minimum total experience (years)", { exact: true })
        .fill("3");
      await page
        .getByLabel("Minimum relevant experience (years)", { exact: true })
        .fill("2");
      await page.getByLabel("Headcount", { exact: true }).fill("2");
      await page
        .getByLabel("Supporting files (optional)", { exact: true })
        .setInputFiles(jobFile);
      await page
        .getByRole("button", { name: "Add question", exact: true })
        .click();
      await page
        .getByLabel("Question 1", { exact: true })
        .fill("Explain an API failure.");
      await page
        .getByRole("button", { name: "Add question", exact: true })
        .click();
      await page
        .getByLabel("Question 2", { exact: true })
        .fill("Explain a database migration.");
      await page
        .getByRole("button", { name: "Move question 2 up", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Remove question 2", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Create opening", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/openings\/[0-9a-f-]+$/, {
      timeout: 60000,
    });
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
    if (!mobile) {
      await expect(
        page.getByText("Engineering", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Explain a database migration.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "python-job-description.pdf" }),
      ).toBeVisible();
    }
    const openingURL = page.url();
    const second = await page.request.post(
      `/api/recruitment/tenants/${tenant}/openings`,
      {
        headers: { origin },
        data: {
          title: "Second active role",
          job_description: "Python API development",
        },
      },
    );
    expect(second.status()).toBe(201);
    await page.goto("/dashboard/openings");
    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(row.getByText("Paused", { exact: true })).toBeVisible();
    await page.goto(openingURL);
    await expect(
      page.getByText(/CV emails received during the pause are skipped/),
    ).toBeVisible();
    await expect(page.getByLabel("CV file", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toBeVisible();
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(page.getByText("Active", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit job", exact: true }).click();
    await expect(page.getByLabel("Job title", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await confirmation
      .getByRole("button", { name: "Close opening", exact: true })
      .click();
    await expect(page.getByText("Closed", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Job title", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit job", exact: true }),
    ).toHaveCount(0);
    if (!mobile)
      await expect(
        page.getByRole("link", { name: "python-job-description.pdf" }),
      ).toBeVisible();
    await page.goto("/dashboard/openings");
    await page
      .getByLabel("Filter by status", { exact: true })
      .selectOption("closed");
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: title })
        .getByText("Closed", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Second active role" }),
    ).toHaveCount(0);
  });
}
