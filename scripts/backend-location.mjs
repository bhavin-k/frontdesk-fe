import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const frontendRoot = resolve(import.meta.dirname, "..");

export function locateBackend() {
  const backend = resolve(frontendRoot, process.env.FRONTDESK_BACKEND_DIR || "../backend");
  if (!existsSync(resolve(backend, "alembic.ini"))) {
    throw new Error("Set FRONTDESK_BACKEND_DIR to the Frontdesk backend folder that contains alembic.ini.");
  }
  const python = resolve(backend, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
  if (!existsSync(python)) {
    throw new Error(`Run uv sync --frozen in ${backend} first.`);
  }
  return { backend, python };
}
