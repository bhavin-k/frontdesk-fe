import { expect, test } from "@playwright/test";

test("public notification gateway rejects forged Gmail calls and preserves Graph validation", async ({
  request,
}) => {
  const response = await request.post("/api/v1/mailbox-webhooks/gmail", {
    data: { message: { data: "e30=", messageId: "untrusted" } },
  });
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("INVALID_NOTIFICATION");
  const token = "validation & challenge";
  const graph = await request.post(
    `/api/v1/mailbox-webhooks/microsoft/00000000-0000-0000-0000-000000000001?${new URLSearchParams({ validationToken: token })}`,
  );
  expect(graph.status()).toBe(200);
  expect(await graph.text()).toBe(token);
  expect(
    (
      await request.post("/api/v1/mailbox-webhooks/unknown", { data: {} })
    ).status(),
  ).toBe(404);
});
