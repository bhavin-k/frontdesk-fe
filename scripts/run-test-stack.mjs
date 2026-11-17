import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { frontendRoot, locateBackend } from "./backend-location.mjs";

const { backend, python } = locateBackend();
const worker = process.argv.includes("worker");
const scoringStrategy = process.env.RECRUITMENT_E2E_SCORING_STRATEGY ?? "rag";
if (scoringStrategy !== "rag" && scoringStrategy !== "full_text") {
  throw new Error("Choose rag or full_text for the browser test stack.");
}

const state = JSON.parse(readFileSync(resolve(frontendRoot, ".local/auth-db-test.json"), "utf8"));
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("RECRUITMENT_")),
);
Object.assign(env, {
  RECRUITMENT_ENVIRONMENT: "test",
  RECRUITMENT_PROVIDER_MODE: "fake",
  RECRUITMENT_MAILBOX_PROVIDER_MODE: "fake",
  RECRUITMENT_PUBLIC_APP_URL: "http://localhost:3102",
  RECRUITMENT_AUTO_DELETE_ENABLED: "false",
  RECRUITMENT_SCORING_STRATEGY: scoringStrategy,
  RECRUITMENT_WORKER_POLL_SECONDS: "0.2",
  RECRUITMENT_ENABLED_MAILBOX_METHODS: "imap,gmail_oauth,microsoft_oauth",
});
for (const role of ["auth", "api", "worker", "dispatcher"]) {
  const key = role === "api" ? "RECRUITMENT_DATABASE_URL" : `RECRUITMENT_${role.toUpperCase()}_DATABASE_URL`;
  env[key] = `postgresql+psycopg://recruitment_${role}:${state[role]}@127.0.0.1:55440/recruitment_auth_test`;
}

const child = spawn(
  python,
  worker
    ? [
        "-c",
        "from recruitment.cli import worker; print('Worker ready', flush=True); worker()",
      ]
    : [
        "-m",
        "uvicorn",
        "recruitment.api.app:create_app",
        "--factory",
        "--host",
        "127.0.0.1",
        "--port",
        "8102",
      ],
  {
    cwd: backend,
    env,
    stdio: "inherit",
    windowsHide: true,
  },
);
child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill("SIGTERM"));
