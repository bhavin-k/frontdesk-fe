import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { frontendRoot as root, locateBackend } from "./backend-location.mjs";

const { backend, python } = locateBackend();
const test = process.argv.includes("--test");
const mode = test ? "test" : "dev";
const name = `recruitment-bt-auth-${mode}`;
const port = test ? 55440 : 55439;
const dbName = `recruitment_auth_${mode}`;
const envFile = resolve(root, test ? ".env.test.local" : ".env.local");
const stateFile = resolve(root, `.local/auth-db-${mode}.json`);
mkdirSync(resolve(root, ".local"), { recursive: true });
const generate = () => randomBytes(32).toString("base64url");
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {
  admin: generate(), auth: generate(), api: generate(), worker: generate(), dispatcher: generate(),
  secret: generate(),
};
if (!existsSync(stateFile) && existsSync(envFile)) {
  throw new Error(`${envFile} already exists. Keep its settings and configure PostgreSQL manually.`);
}
writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, ...options });
  if (result.error || result.status !== 0) {
    // Do not echo environment variables or connection URLs on failure.
    throw new Error(`${command} ${args[0]} failed: ${result.stderr ?? result.error?.message}`);
  }
  return result.stdout.trim();
};
const exists = spawnSync("docker", ["container", "inspect", name], { stdio: "ignore", windowsHide: true }).status === 0;
if (!exists) {
  run("docker", ["run", "-d", "--name", name, "-p", `127.0.0.1:${port}:5432`,
    "-e", "POSTGRES_PASSWORD", "-e", `POSTGRES_DB=${dbName}`,
    "postgres:16.15-bookworm@sha256:5264710be20f409750ac6dc4e5706dcef929c87e241605463f0f9aefa932a8d9"],
  { env: { ...process.env, POSTGRES_PASSWORD: state.admin } });
} else {
  run("docker", ["start", name]);
}
for (let attempt = 0; ; attempt++) {
  const ready = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres", "-d", dbName], { stdio: "ignore", windowsHide: true });
  if (ready.status === 0) break;
  if (attempt >= 30) throw new Error("PostgreSQL did not become ready.");
  await setTimeout(500);
}
const migrationEnv = {
  ...process.env,
  RECRUITMENT_MIGRATION_DATABASE_URL: `postgresql+psycopg://postgres:${state.admin}@127.0.0.1:${port}/${dbName}`,
};
for (const role of ["auth", "api", "worker", "dispatcher"]) {
  migrationEnv[`RECRUITMENT_DB_${role.toUpperCase()}_PASSWORD`] = state[role];
}
run(python, ["scripts/migrate.py", "upgrade"], { cwd: backend, env: migrationEnv });
const authURL = `postgresql://recruitment_auth:${state.auth}@127.0.0.1:${port}/${dbName}`;
const apiURL = `postgresql://recruitment_api:${state.api}@127.0.0.1:${port}/${dbName}`;
if (!existsSync(envFile)) {
  writeFileSync(envFile, [
    `APP_BASE_URL=http://localhost:${test ? 3101 : 3100}`,
    `RECRUITMENT_AUTH_DATABASE_URL=${authURL}`,
    `BETTER_AUTH_SECRET=${state.secret}`,
    ...(test ? [`RECRUITMENT_AUTH_TEST_DATABASE_URL=${authURL}`, `RECRUITMENT_API_TEST_DATABASE_URL=${apiURL}`] : []),
    "",
  ].join("\n"), { mode: 0o600 });
}
console.log(`Frontdesk auth ${mode} database is ready. Settings in ${test ? ".env.test.local" : ".env.local"}.`);
