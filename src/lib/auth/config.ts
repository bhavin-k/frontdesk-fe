export type AuthConfig = {
  baseURL: string;
  databaseURL: string;
  secret: string;
  secureCookies: boolean;
  google?: { clientId: string; clientSecret: string };
};

export function readGoogleAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig["google"] {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId && !clientSecret) return undefined;
  if (!clientId || !clientSecret) {
    throw new Error("Configure both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google sign-in.");
  }
  if (!clientId.endsWith(".apps.googleusercontent.com") || /\s/.test(clientId) || /\s/.test(clientSecret)) {
    throw new Error("Google sign-in requires a valid Google web OAuth client configuration.");
  }
  return { clientId, clientSecret };
}

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const baseURL = new URL(env.APP_BASE_URL ?? "http://localhost:3100");
  if (!["http:", "https:"].includes(baseURL.protocol) || baseURL.username || baseURL.password ||
      baseURL.pathname !== "/" || baseURL.search || baseURL.hash) {
    throw new Error("APP_BASE_URL must be an HTTP(S) origin.");
  }
  if (env.NODE_ENV === "production" && baseURL.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTPS in production.");
  }
  const databaseURL = env.RECRUITMENT_AUTH_DATABASE_URL;
  if (!databaseURL || !["postgres:", "postgresql:"].includes(new URL(databaseURL).protocol)) {
    throw new Error("RECRUITMENT_AUTH_DATABASE_URL must be a PostgreSQL URL.");
  }
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 random characters.");
  }
  return {
    baseURL: baseURL.origin, databaseURL, secret,
    secureCookies: baseURL.protocol === "https:", google: readGoogleAuthConfig(env),
  };
}
