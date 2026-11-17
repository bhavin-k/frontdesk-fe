import { loadEnvFile } from "node:process";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
loadEnvFile(resolve(root, ".env.test.local"));
// Automated tests configure their own identity provider and never inherit live credentials.
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
const database = new URL(process.env.RECRUITMENT_AUTH_TEST_DATABASE_URL ?? "");
if (database.pathname !== "/recruitment_auth_test" ||
    process.env.RECRUITMENT_AUTH_DATABASE_URL !== database.href) {
  throw new Error("Tests must use the dedicated recruitment_auth_test database.");
}
const child = spawn(process.execPath, process.argv.slice(2), {
  cwd: root, env: process.env, stdio: "inherit", windowsHide: true,
});
child.on("error", () => { process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
