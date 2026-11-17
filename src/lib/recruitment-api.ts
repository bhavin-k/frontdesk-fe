import "server-only";
import { getSession } from "@/lib/auth/session";
import { forwardRecruitmentRequest } from "@/lib/recruitment/proxy";

export async function recruitmentRequest(
  request: Request,
  segments: string[],
): Promise<Response> {
  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession();
  } catch {
    return Response.json(
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "Authentication is temporarily unavailable. Retry shortly.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return forwardRecruitmentRequest(request, segments, {
    token: session?.session.token ?? null,
    baseURL: process.env.RECRUITMENT_API_BASE_URL,
    origin: new URL(process.env.APP_BASE_URL ?? "http://localhost:3100").origin,
  });
}

export async function getRecruitmentIdentity(
  request: Request,
): Promise<Response> {
  return recruitmentRequest(request, ["me"]);
}
