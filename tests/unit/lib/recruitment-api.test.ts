import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/recruitment/proxy", () => ({
  forwardRecruitmentRequest: vi.fn(),
}));
import { getSession } from "@/lib/auth/session";
import { forwardRecruitmentRequest } from "@/lib/recruitment/proxy";
import { recruitmentRequest } from "@/lib/recruitment-api";

beforeEach(() => vi.resetAllMocks());

it("returns a sanitized failure when session validation is unavailable", async () => {
  vi.mocked(getSession).mockRejectedValue(
    new Error("private database failure"),
  );
  const response = await recruitmentRequest(
    new Request("http://localhost:3100/api/recruitment/me"),
    ["me"],
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    error: {
      code: "AUTH_UNAVAILABLE",
      message: "Authentication is temporarily unavailable. Retry shortly.",
    },
  });
  expect(forwardRecruitmentRequest).not.toHaveBeenCalled();
});
