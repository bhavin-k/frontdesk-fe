// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Mailboxes } from "@/features/recruitment/intake/mailboxes";
import type { Mailbox } from "@/features/recruitment/intake/types";
import { api } from "@/features/recruitment/api";

vi.mock("@/features/recruitment/api", () => ({
  api: vi.fn(),
  displayTime: (value: string) => value,
}));
vi.mock("@/features/dashboard/ui", () => ({
  StatusBadge: ({ value }: { value: string }) => <span>{value}</span>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const oauth = [
  { id: "gmail", connection_method: "gmail_oauth" as const, configured: true },
  {
    id: "microsoft",
    connection_method: "microsoft_oauth" as const,
    configured: true,
  },
];
const mailbox: Mailbox = {
  id: "mailbox-id",
  provider: "gmail",
  connection_method: "imap",
  enabled: false,
  email: "owner@gmail.com",
  status: "connected",
  opening_id: "opening-id",
  folder_id: "INBOX",
  generation: 1,
  intake_started_at: "2026-11-04T08:00:00Z",
  sync_status: "idle",
  failure_code: null,
  last_success_at: null,
  stalled: false,
  provider_mode: "fake",
};

describe("mailbox connection methods", () => {
  it("requires an explicit opening when several roles are active", async () => {
    const changed = vi.fn();
    vi.mocked(api).mockResolvedValue(mailbox);
    render(
      <Mailboxes
        base="/tenants/test"
        rows={[]}
        onChanged={changed}
        openingOptions={[
          { id: "role-one", title: "Python" },
          { id: "role-two", title: "Java" },
        ]}
        capabilities={{
          provider_mode: "fake",
          items: [{ id: "gmail", connection_method: "imap", configured: true }],
        }}
      />,
    );
    const connect = screen.getByRole("button", {
      name: "Connect Gmail with IMAP (testing)",
    });
    expect((connect as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Opening"), {
      target: { value: "role-two" },
    });
    fireEvent.click(connect);
    fireEvent.change(screen.getByLabelText("Gmail address"), {
      target: { value: "fixture@example.org" },
    });
    fireEvent.change(screen.getByLabelText("Google App Password"), {
      target: { value: "test".repeat(4) },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify IMAP connection" }),
    );
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(
      JSON.parse(vi.mocked(api).mock.calls[0][1]?.body as string).opening_id,
    ).toBe("role-two");
  });

  it("hides IMAP and disables an existing IMAP connection when the server removes it", () => {
    render(
      <Mailboxes
        base="/tenants/test"
        openingId="opening-id"
        rows={[mailbox]}
        capabilities={{ provider_mode: "fake", items: oauth }}
        onChanged={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: "Connect Gmail with IMAP (testing)",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Check for new email" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Source settings" }),
    ).toBeNull();
    expect(screen.getByText(/Intake has stopped/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });

  it("submits IMAP credentials through the private bridge and clears the password field", async () => {
    const changed = vi.fn();
    vi.mocked(api).mockResolvedValueOnce({
      ...mailbox,
      enabled: true,
      status: "needs_configuration",
    });
    render(
      <Mailboxes
        base="/tenants/test"
        openingId="opening-id"
        rows={[]}
        capabilities={{
          provider_mode: "fake",
          items: [
            ...oauth,
            { id: "gmail", connection_method: "imap", configured: true },
          ],
        }}
        onChanged={changed}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Connect Gmail with IMAP (testing)" }),
    );
    fireEvent.change(screen.getByLabelText("Gmail address"), {
      target: { value: "owner@gmail.com" },
    });
    const password = screen.getByLabelText(
      "Google App Password",
    ) as HTMLInputElement;
    fireEvent.change(password, { target: { value: "test".repeat(4) } });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify IMAP connection" }),
    );
    expect(password.value).toBe("");
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(api).toHaveBeenCalledWith("/tenants/test/mailboxes/imap", {
      method: "POST",
      body: JSON.stringify({
        app_password: "test".repeat(4),
        email: "owner@gmail.com",
        opening_id: "opening-id",
      }),
    });
    expect(screen.queryByLabelText("Google App Password")).toBeNull();
  });
});
