import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  const headers = { "Cache-Control": "no-store" };
  if (!session)
    return Response.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers },
    );
  const { id, name, email, emailVerified } = session.user;
  return Response.json(
    { user: { id, name, email, emailVerified } },
    { headers },
  );
}
