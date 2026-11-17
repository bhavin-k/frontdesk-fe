import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/features/recruitment/api";

afterEach(() => vi.unstubAllGlobals());

describe("recruitment client failures", () => {
  it("turns an empty server failure into a readable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );
    await expect(api("/me")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      status: 500,
      message: "The service returned an incomplete response. Retry shortly.",
    });
  });

  it("preserves structured backend errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            {
              error: { code: "STATE_CONFLICT", message: "Refresh the record." },
            },
            { status: 409 },
          ),
        ),
    );
    try {
      await api("/me");
      throw new Error("Expected the request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ code: "STATE_CONFLICT", status: 409 });
    }
  });
});
