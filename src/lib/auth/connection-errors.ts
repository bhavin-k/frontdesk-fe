const connectionCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "08000",
  "08001",
  "08003",
  "08006",
  "57P01",
  "57P02",
  "57P03",
]);

const connectionMessages = new Set([
  "Connection terminated unexpectedly",
  "Connection terminated due to connection timeout",
  "timeout exceeded when trying to connect",
  "timeout expired",
]);

export function isAuthConnectionError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 8; depth++) {
    if (!current || typeof current !== "object") return false;
    if (
      ("code" in current && typeof current.code === "string" && connectionCodes.has(current.code)) ||
      ("message" in current && typeof current.message === "string" && connectionMessages.has(current.message))
    ) return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
