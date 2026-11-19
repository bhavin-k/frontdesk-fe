import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "./server";
import { isAuthConnectionError } from "./connection-errors";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  // The database still validates every presented session, including forged cookies.
  if (!requestHeaders.get("cookie")?.includes("recruitment-bt.session_token=")) return null;
  try {
    return await (await getAuth()).api.getSession({ headers: requestHeaders });
  } catch (error) {
    if (!isAuthConnectionError(error)) throw error;
    // pg discards failed connections. A fresh read also checks session revocation.
    return (await getAuth()).api.getSession({ headers: requestHeaders });
  }
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
