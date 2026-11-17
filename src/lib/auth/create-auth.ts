import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { Pool } from "pg";
import type { AuthConfig } from "./config";
import { discardOAuthTokens, googleIdentityScopes } from "./google";

export const authCookiePrefix = "recruitment-bt";

export function createRecruitmentAuth(pool: Pool, config: AuthConfig) {
  return betterAuth({
    appName: "Frontdesk",
    baseURL: config.baseURL,
    basePath: "/api/auth",
    trustedOrigins: [config.baseURL],
    secret: config.secret,
    database: pool,
    logger: {
      level: "error",
      log: () => console.error("Frontdesk authentication request failed."),
    },
    socialProviders: config.google ? {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        accessType: "online",
        prompt: "select_account",
        includeGrantedScopes: false,
        disableDefaultScope: true,
        scope: [...googleIdentityScopes],
      },
    } : {},
    onAPIError: { errorURL: `${config.baseURL}/login` },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (!["/sign-in/social", "/link-social"].includes(context.path)) return;
        const body = context.body;
        if (body?.provider !== "google") return;
        if (body.idToken || body.additionalParams ||
            (body.scopes && (!Array.isArray(body.scopes) || body.scopes.some(
              (scope: string) => !googleIdentityScopes.includes(scope as typeof googleIdentityScopes[number]),
            )))) {
          throw new APIError("BAD_REQUEST", {
            code: "GOOGLE_IDENTITY_FLOW_REQUIRED",
            message: "Use the Google identity authorization flow. Connect mailboxes through Integrations.",
          });
        }
      }),
    },
    databaseHooks: {
      account: {
        create: { before: async (account) => ({ data: discardOAuthTokens(account) }) },
        update: { before: async (account) => ({ data: discardOAuthTokens(account) }) },
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    // Verification remains false on the user; signup does not claim email ownership.
    emailVerification: { sendOnSignUp: false, sendOnSignIn: false },
    user: {
      modelName: "users",
      fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
      validateUserInfo: async ({ user, source }) => {
        if (source.method === "oauth" && source.oauth?.providerId === "google" && user.emailVerified !== true) {
          return { error: "google_email_not_verified" };
        }
      },
    },
    account: {
      modelName: "better_auth_accounts",
      accountLinking: { enabled: true, disableImplicitLinking: true, allowDifferentEmails: false },
      storeStateStrategy: "database",
      storeAccountCookie: false,
      fields: {
        userId: "user_id", accountId: "account_id", providerId: "provider_id",
        accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at", updatedAt: "updated_at",
      },
    },
    session: {
      modelName: "better_auth_sessions",
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
      fields: {
        userId: "user_id", expiresAt: "expires_at", ipAddress: "ip_address",
        userAgent: "user_agent", createdAt: "created_at", updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "better_auth_verifications",
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "better_auth_rate_limits",
      fields: { lastRequest: "last_request" },
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/sign-in/social": { window: 60, max: 10 },
        "/link-social": { window: 60, max: 5 },
      },
    },
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
      cookiePrefix: authCookiePrefix,
      useSecureCookies: config.secureCookies,
      database: { generateId: () => randomUUID() },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
  });
}
