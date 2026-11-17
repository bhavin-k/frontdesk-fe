import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const origin = "http://localhost:3102";
function datedCV() {
  const python = resolve(
    process.cwd(),
    process.env.FRONTDESK_BACKEND_DIR || "../backend",
    process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python",
  );
  const value = spawnSync(python, ["-c", `
from datetime import datetime, timezone
import sys, pymupdf
today=datetime.now(timezone.utc)
index=today.year*12+today.month-1
month=lambda delta: f"{(index+delta)//12:04d}-{(index+delta)%12+1:02d}"
text=f"Fixture Candidate\\nfixture@example.org\\nSoftware Engineer Intern {month(-10)} to {month(-4)} Python\\nSoftware Engineer {month(-4)} to Present Python development"
document=pymupdf.open()
page=document.new_page()
page.insert_text((40,50),text,fontsize=10)
sys.stdout.buffer.write(document.tobytes())
document.close()
`], { windowsHide: true });
  expect(value.status, value.stderr.toString()).toBe(0);
  return value.stdout;
}

for (const mobile of [false, true]) {
  test(`${mobile ? "mobile" : "desktop"}: experience gate, alternative role and Select/Reject without reason`, async ({ page, context }) => {
    test.setTimeout(180000);
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `198.18.${Math.floor(Math.random()*200)+1}.${Math.floor(Math.random()*200)+1}` });
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const signup = await page.request.post("/api/auth/sign-up/email", { headers: { origin },
      data: { name: "Experience test recruiter", email: `experience-${randomUUID()}@example.invalid`, password: `Recruiter-${randomUUID()}!` } });
    expect(signup.status()).toBe(200);
    const business = await page.request.post("/api/recruitment/tenants", { headers: { origin }, data: { name: "Experience matching test" } });
    expect(business.status()).toBe(201);
    const tenant = (await business.json()).id;
    const base = `/api/recruitment/tenants/${tenant}`;
    const openings: { id: string }[] = [];
    for (const [title, description] of [["Senior Python", "2 years relevant experience; Python development"], ["Junior Python", "Python development"]]) {
      const created = await page.request.post(`${base}/openings`, { headers: { origin }, data: { title, job_description: description } });
      expect(created.status()).toBe(201);
      const role = await created.json();
      openings.push(role);
      await expect.poll(async () => (await (await page.request.get(`${base}/openings/${role.id}`)).json()).criteria_status).toBe("ready");
    }
    const uploaded = await page.request.post(`${base}/openings/${openings[0].id}/cv-uploads`, {
      headers: { origin, "Idempotency-Key": randomUUID() },
      multipart: { file: { name: "experience-cv.pdf", mimeType: "application/pdf", buffer: datedCV() } },
    });
    expect(uploaded.status()).toBe(202);
    const upload = await uploaded.json();
    await expect.poll(async () => (await (await page.request.get(`${base}/cv-uploads/${upload.upload_id}`)).json()).status).toBe("completed");
    const uploadState = await (await page.request.get(`${base}/cv-uploads/${upload.upload_id}`)).json();
    const assessed = await (await page.request.get(`${base}/applications/${uploadState.application_id}/match-results`)).json();
    const strategy = process.env.RECRUITMENT_E2E_SCORING_STRATEGY ?? "rag";
    expect(assessed.result.scoring_strategy).toBe(strategy);
    const senior = assessed.evaluation.roles.find((role: { opening_id: string }) => role.opening_id === openings[0].id);
    const junior = assessed.evaluation.roles.find((role: { opening_id: string }) => role.opening_id === openings[1].id);
    expect(senior.eligibility.professional_months).toBe(4);
    expect(assessed.evaluation.recommendation).toBe("recommended_shortlist");
    expect((await (await page.request.get(`${base}/overview`)).json()).totals.shortlisted).toBe(0);
    await page.goto(`/dashboard/review/${upload.upload_id}`);
    await expect(page.getByRole("heading", { name: "AI recommendation", exact: true })).toBeVisible();
    await expect(page.getByLabel("Recruiter reason", { exact: true })).toHaveCount(0);
    await expect(page.locator("#decision option:not([disabled])")).toHaveText(["Select", "Reject"]);
    await page.getByLabel("Assessed role", { exact: true }).selectOption(senior.id);
    await expect(page.getByTestId("role-match-score")).toHaveText("Not scored — experience requirement not met");
    await expect(page.getByText("CV documents 4 months of professional experience; this role requires 24 months. Internships are excluded.", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Assessed role", { exact: true }).selectOption(junior.id);
    await expect(page.getByTestId("role-match-score")).toHaveText("100/100");
    if (strategy === "full_text") {
      await expect(page.locator("figcaption").filter({ hasText: /^Page 1$/ }).first()).toBeVisible();
    } else {
      await expect(page.locator("figcaption").filter({ hasText: "CV chunk" }).first()).toBeVisible();
    }
    await page.getByLabel("Decision", { exact: true }).selectOption("shortlist");
    await page.getByRole("button", { name: "Save recruiter decision", exact: true }).click();
    await expect(page.getByText("Saved recruiter decision", { exact: true })).toBeVisible();
    await expect.poll(async () => (await (await page.request.get(`${base}/applications/${uploadState.application_id}`)).json()).status).toBe("shortlisted");
    await page.getByLabel("Decision", { exact: true }).selectOption("reject");
    await page.getByRole("checkbox", { name: "I reviewed the evidence and confirm this rejection", exact: true }).check();
    await page.getByRole("button", { name: "Save recruiter decision", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm rejection", exact: true }).click();
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
