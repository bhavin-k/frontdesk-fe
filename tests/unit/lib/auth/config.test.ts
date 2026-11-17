import { expect, it } from "vitest";
import { readAuthConfig, readGoogleAuthConfig } from "@/lib/auth/config";

const env = {
  NODE_ENV: "test" as const,
  APP_BASE_URL: "http://localhost:3100",
  RECRUITMENT_AUTH_DATABASE_URL: "postgresql://recruitment_auth:test@localhost/recruitment_auth_test",
  BETTER_AUTH_SECRET: "test-secret-with-more-than-thirty-two-characters",
};

it("requires a secret and a dedicated PostgreSQL connection", () => {
  expect(() => readAuthConfig({ ...env, BETTER_AUTH_SECRET: "short" })).toThrow("BETTER_AUTH_SECRET");
  expect(() => readAuthConfig({ ...env, RECRUITMENT_AUTH_DATABASE_URL: undefined })).toThrow("RECRUITMENT_AUTH_DATABASE_URL");
});

it("requires HTTPS in production and an origin without a path", () => {
  expect(() => readAuthConfig({ ...env, NODE_ENV: "production" })).toThrow("HTTPS");
  expect(() => readAuthConfig({ ...env, APP_BASE_URL: "https://recruitment.example/login" })).toThrow("origin");
  expect(readAuthConfig({ ...env, NODE_ENV: "production", APP_BASE_URL: "https://recruitment.example" }).secureCookies).toBe(true);
});

it("enables Google only when the server has both credentials", () => {
  expect(readGoogleAuthConfig({})).toBeUndefined();
  expect(readGoogleAuthConfig({ GOOGLE_CLIENT_ID: " ", GOOGLE_CLIENT_SECRET: "" })).toBeUndefined();
  expect(() => readGoogleAuthConfig({ GOOGLE_CLIENT_ID: "unit.apps.googleusercontent.com" })).toThrow("both");
  expect(() => readGoogleAuthConfig({ GOOGLE_CLIENT_SECRET: "unit-only-secret" })).toThrow("both");
  const google = { GOOGLE_CLIENT_ID: "unit.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "unit-only-secret" };
  expect(readAuthConfig({ ...env, ...google }).google).toEqual({ clientId: google.GOOGLE_CLIENT_ID, clientSecret: google.GOOGLE_CLIENT_SECRET });
});

it("rejects invalid Google configuration without including secret values in errors", () => {
  expect(() => readGoogleAuthConfig({ GOOGLE_CLIENT_ID: "invalid-client", GOOGLE_CLIENT_SECRET: "unit-only-secret" })).toThrow("valid Google web OAuth");
  expect(() => readGoogleAuthConfig({ GOOGLE_CLIENT_ID: "unit.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "unit secret" })).toThrow("valid Google web OAuth");
});
