import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:3102",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/run-test-stack.mjs",
      url: "http://127.0.0.1:8102/health/ready",
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: "node scripts/run-test-stack.mjs worker",
      wait: { stdout: /Worker ready/ },
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command:
        "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3102",
      env: {
        APP_BASE_URL: "http://localhost:3102",
        NEXT_BUILD_DIR: ".next-e2e",
        RECRUITMENT_API_BASE_URL: "http://127.0.0.1:8102",
        RECRUITMENT_PROVIDER_MODE: "fake",
        GOOGLE_CLIENT_ID: "local-e2e.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "local-e2e-only",
        RECRUITMENT_TEST_GOOGLE_OAUTH: "local-fake",
        NODE_OPTIONS: `--import=${new URL("./tests/e2e/support/google-oauth.mjs", import.meta.url).href}`,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      url: "http://localhost:3102/login",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
