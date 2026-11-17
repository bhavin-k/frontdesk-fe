// Loaded only by Playwright's dedicated Next.js server; never by the app launcher.
import { createHash, generateKeyPairSync, sign } from "node:crypto";

const clientId = "local-e2e.apps.googleusercontent.com";
if (process.env.RECRUITMENT_TEST_GOOGLE_OAUTH !== "local-fake" ||
    process.env.NODE_ENV === "production" ||
    new URL(process.env.RECRUITMENT_AUTH_DATABASE_URL ?? "http://invalid").pathname !== "/recruitment_auth_test" ||
    process.env.GOOGLE_CLIENT_ID !== clientId || process.env.GOOGLE_CLIENT_SECRET !== "local-e2e-only") {
  throw new Error("The local OAuth fake requires the dedicated browser-test database and test credentials.");
}

const originalFetch = globalThis.fetch;
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "local-e2e-key", alg: "RS256", use: "sig" };
const usedCodes = new Set();
const encoded = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.origin === "https://oauth2.googleapis.com" && url.pathname === "/token") {
    const body = new URLSearchParams(init?.body ?? (input instanceof Request ? await input.text() : ""));
    const code = body.get("code");
    let identity;
    try { identity = JSON.parse(Buffer.from(code ?? "", "base64url").toString()); } catch { /* Rejected below. */ }
    const challenge = createHash("sha256").update(body.get("code_verifier") ?? "").digest("base64url");
    if (!identity || usedCodes.has(code) || body.get("grant_type") !== "authorization_code" ||
        body.get("client_id") !== clientId || body.get("client_secret") !== "local-e2e-only" ||
        !identity.email?.endsWith("@example.invalid") || !identity.sub?.startsWith("local-e2e-") ||
        identity.challenge !== challenge || identity.redirectURI !== body.get("redirect_uri")) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    usedCodes.add(code);
    const issued = Math.floor(Date.now() / 1000);
    const claims = {
      iss: "https://accounts.google.com", aud: clientId, azp: clientId,
      sub: identity.sub, email: identity.email, email_verified: true,
      name: "Google Browser Recruiter", iat: issued, exp: issued + 3600,
    };
    const unsigned = `${encoded({ alg: "RS256", kid: jwk.kid, typ: "JWT" })}.${encoded(claims)}`;
    const idToken = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
    return Response.json({ access_token: "local-e2e-access-token", token_type: "Bearer", expires_in: 3600, scope: "openid email profile", id_token: idToken });
  }
  if (url.origin === "https://www.googleapis.com" && url.pathname === "/oauth2/v3/certs") {
    return Response.json({ keys: [jwk] });
  }
  if (["http:", "https:"].includes(url.protocol) && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("External requests are blocked by the browser-test OAuth fake.");
  }
  return originalFetch(input, init);
};
