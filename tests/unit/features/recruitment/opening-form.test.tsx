// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { createI18nInstance } from "@/i18n";
import { OpeningForm } from "@/features/recruitment/opening-form";
import { api } from "@/features/recruitment/api";
import type { Opening } from "@/features/recruitment/types";

vi.mock("@/features/recruitment/api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const opening: Opening = {
  id: "opening",
  title: "Python Developer",
  job_description: "Python API development",
  status: "active",
  revision: 2,
  source_revision: 1,
  details: {},
  questions: [],
  documents: [],
};

function form(initial?: Opening) {
  const saved = vi.fn();
  vi.mocked(api).mockResolvedValue(opening);
  render(
    <I18nextProvider i18n={createI18nInstance()}>
      <OpeningForm
        base="/tenants/business"
        initial={initial}
        onCreated={saved}
      />
    </I18nextProvider>,
  );
  return saved;
}

it("creates a job using only title and description without scoring controls", async () => {
  const saved = form();
  expect(
    screen.queryByLabelText(/weight|threshold|strict|criterion/i),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: opening.title },
  });
  fireEvent.change(screen.getByLabelText("Job description"), {
    target: { value: opening.job_description },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Create opening" }).closest("form")!,
  );
  await waitFor(() => expect(saved).toHaveBeenCalledWith(opening));
  const [path, request] = vi.mocked(api).mock.calls[0];
  const body = JSON.parse(request?.body as string);
  expect(path).toBe("/tenants/business/openings");
  expect(body.title).toBe(opening.title);
  expect(body.questions).toEqual([]);
  expect(body.details.headcount).toBeNull();
  expect(body).not.toHaveProperty("criteria");
  expect(body).not.toHaveProperty("shortlist_threshold");
  expect(request?.headers).not.toHaveProperty("Authorization");
});

it("edits and reorders questions using the original revision", async () => {
  form({ ...opening, questions: ["First question?", "Second question?"] });
  fireEvent.click(screen.getByRole("button", { name: "Move question 2 up" }));
  expect(
    (screen.getByLabelText("Question 1") as HTMLTextAreaElement).value,
  ).toBe("Second question?");
  fireEvent.click(screen.getByRole("button", { name: "Remove question 2" }));
  fireEvent.change(screen.getByLabelText("Question 1"), {
    target: { value: "Explain an API failure." },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save job" }).closest("form")!,
  );
  await waitFor(() => expect(api).toHaveBeenCalled());
  const [path, request] = vi.mocked(api).mock.calls[0];
  expect(path).toBe("/tenants/business/openings/opening");
  expect(request?.method).toBe("PATCH");
  expect(JSON.parse(request?.body as string)).toMatchObject({
    expected_revision: 2,
    questions: ["Explain an API failure."],
  });
});

it("keeps job details and question text available after a failed save", async () => {
  form(opening);
  vi.mocked(api).mockRejectedValueOnce(
    new Error("This opening changed. Reload and retry."),
  );
  fireEvent.change(screen.getByLabelText("Department"), {
    target: { value: "Engineering" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add question" }));
  fireEvent.change(screen.getByLabelText("Question 1"), {
    target: { value: "Explain database transactions." },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save job" }).closest("form")!,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Reload and retry"),
  );
  expect((screen.getByLabelText("Department") as HTMLInputElement).value).toBe(
    "Engineering",
  );
  expect(
    (screen.getByLabelText("Question 1") as HTMLTextAreaElement).value,
  ).toBe("Explain database transactions.");
});
