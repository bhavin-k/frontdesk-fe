import "server-only";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { readAuthConfig } from "./config";
import { createRecruitmentAuth } from "./create-auth";

type Auth = ReturnType<typeof createRecruitmentAuth>;
const globalAuth = globalThis as typeof globalThis & {
  recruitmentAuth?: Promise<Auth>;
  recruitmentAuthConfigKey?: string;
  recruitmentAuthPool?: Pool;
};

export function getAuth(): Promise<Auth> {
  const config = readAuthConfig();
  // Bump the policy version when changing auth behavior during a long-lived dev session.
  const key = createHash("sha256").update(JSON.stringify({ policyVersion: 1, config })).digest("hex");
  if (!globalAuth.recruitmentAuth || globalAuth.recruitmentAuthConfigKey !== key) {
    const previousPool = globalAuth.recruitmentAuthPool;
    globalAuth.recruitmentAuthConfigKey = key;
    globalAuth.recruitmentAuth = initializeAuth(config).catch((error: unknown) => {
      if (globalAuth.recruitmentAuthConfigKey === key) globalAuth.recruitmentAuth = undefined;
      throw error;
    });
    void previousPool?.end().catch(() => undefined);
  }
  return globalAuth.recruitmentAuth;
}

async function initializeAuth(config: ReturnType<typeof readAuthConfig>): Promise<Auth> {
  const pool = new Pool({ connectionString: config.databaseURL, max: 10, connectionTimeoutMillis: 5000 });
  globalAuth.recruitmentAuthPool = pool;
  // Do not log database errors here: connection details can contain credentials.
  pool.on("error", () => console.error("Recruitment authentication database connection failed."));
  try {
    const result = await pool.query<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>(
      "SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
    );
    const role = result.rows[0];
    if (!role || role.current_user !== "recruitment_auth" || role.rolsuper || role.rolbypassrls) {
      throw new Error("Authentication requires the restricted recruitment_auth database role.");
    }
    return createRecruitmentAuth(pool, config);
  } catch (error) {
    await pool.end();
    throw error;
  }
}
