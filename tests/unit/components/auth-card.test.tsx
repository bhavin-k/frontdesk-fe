// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthCard } from "@/components/auth-card";
import { authClient } from "@/lib/auth/client";
import { authCopy } from "@/lib/copy";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/client", () => ({
  authClient: { signIn: { social: vi.fn() }, signUp: { email: vi.fn() } },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps email login available when Google is not configured", () => {
  render(<AuthCard mode="login" />);
  expect(screen.queryByRole("button", { name: authCopy.googleContinue })).toBeNull();
  expect(screen.getByRole("button", { name: authCopy.login })).toBeTruthy();
});

it.each(["login", "signup"] as const)("starts Google %s without requiring the password form", async (mode) => {
  vi.mocked(authClient.signIn.social).mockResolvedValue({ error: { status: 503 } } as never);
  render(<AuthCard mode={mode} googleEnabled />);
  fireEvent.click(screen.getByRole("button", { name: authCopy.googleContinue }));
  await waitFor(() => expect(authClient.signIn.social).toHaveBeenCalledWith({
    provider: "google", callbackURL: "/dashboard", newUserCallbackURL: "/dashboard",
    errorCallbackURL: mode === "signup" ? "/signup" : "/login", requestSignUp: mode === "signup",
  }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(authCopy.googleFailed));
});

it("shows safe callback errors and keeps password sign-in usable", () => {
  render(<AuthCard mode="login" googleEnabled initialError={authCopy.googleLinkRequired} />);
  expect(screen.getByRole("alert").textContent).toContain(authCopy.googleLinkRequired);
  expect((screen.getByLabelText(authCopy.email) as HTMLInputElement).disabled).toBe(false);
});

it("disables the server-rendered credentials form until hydration and never uses a GET submission", () => {
  const markup = renderToStaticMarkup(<AuthCard mode="login" googleEnabled />);
  expect(markup).toContain('method="post"');
  expect(markup).toMatch(/<fieldset[^>]*disabled/);
});
