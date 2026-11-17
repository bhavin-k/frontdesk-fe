import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "./server";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  // The database still validates every presented session, including forged cookies.
  if (!requestHeaders.get("cookie")?.includes("recruitment-bt.session_token=")) return null;
  return (await getAuth()).api.getSession({ headers: requestHeaders });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
