import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { forwardRecruitmentRequest } from "@/lib/recruitment/proxy";
import type { Identity, Page } from "@/features/recruitment/types";
import type { CandidateSummary } from "@/features/recruitment/intake/types";

type WebSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type InitialCandidates = {
  userId: string;
  tenantId: string;
  data: Page<CandidateSummary>;
  updatedAt: number;
};
type Bootstrap = {
  identity?: Identity;
  initialCandidates?: InitialCandidates;
  error?: true;
  candidateError?: true;
};

function identityForUser(identity: Identity, userId: string): Identity | undefined {
  return identity.user_id === userId ? {
    user_id: identity.user_id,
    memberships: identity.memberships.map(({ tenant_id, name, role }) => ({ tenant_id, name, role })),
  } : undefined;
}

async function readIdentity(session: WebSession): Promise<Identity | undefined> {
  const origin = new URL(process.env.APP_BASE_URL ?? "http://localhost:3100").origin;
  const response = await forwardRecruitmentRequest(
    new Request(`${origin}/api/recruitment/me`), ["me"],
    { token: session.session.token, baseURL: process.env.RECRUITMENT_API_BASE_URL, origin },
  );
  return response.ok ? identityForUser(await response.json() as Identity, session.user.id) : undefined;
}

// React's cache shares reads only within this server render, never across sessions.
export const getDashboardBootstrap = cache(async (): Promise<Bootstrap> => {
  const [session, jar] = await Promise.all([getSession(), cookies()]);
  if (!session) return { error: true };
  const selected = jar.get("recruitment-business")?.value;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    if (selected && !uuid.test(selected)) {
      const identity = await readIdentity(session);
      return identity ? { identity } : { error: true };
    }
    const origin = new URL(process.env.APP_BASE_URL ?? "http://localhost:3100").origin;
    const target = new URL(`${origin}/api/recruitment/dashboard-bootstrap`);
    if (selected) target.searchParams.set("tenant_id", selected);
    const response = await forwardRecruitmentRequest(new Request(target), ["dashboard-bootstrap"], {
      token: session.session.token, baseURL: process.env.RECRUITMENT_API_BASE_URL, origin,
    });
    if (!response.ok) return { error: true };
    if (process.env.NODE_ENV === "development" && response.headers.has("Server-Timing")) {
      console.info("[frontdesk.dashboard.timing]", response.headers.get("Server-Timing"));
    }
    const payload = await response.json() as {
      identity: Identity; tenant_id: string | null;
      candidates: Page<CandidateSummary> | null; candidate_error: { code: string } | null;
    };
    const identity = identityForUser(payload.identity, session.user.id);
    if (!identity) return { error: true };
    if (payload.candidate_error) return { identity, candidateError: true };
    if (!payload.tenant_id) return { identity };
    if ((selected && selected !== payload.tenant_id) ||
        !identity.memberships.some(item => item.tenant_id === payload.tenant_id)) {
      return { identity, candidateError: true };
    }
    const data = payload.candidates;
    if (!data || !Array.isArray(data.items) || data.limit !== 20 || data.offset !== 0) {
      return { identity, candidateError: true };
    }
    return { identity, initialCandidates: {
      userId: session.user.id, tenantId: payload.tenant_id, data, updatedAt: Date.now(),
    } };
  } catch {
    return { error: true };
  }
});

export const isCandidatesRequest = cache(async () =>
  (await headers()).get("x-frontdesk-initial-view") === "candidates");

export const getInitialRecruitmentIdentity = cache(async (): Promise<Identity | undefined> => {
  if (await isCandidatesRequest()) return (await getDashboardBootstrap()).identity;
  const session = await getSession();
  return session ? readIdentity(session) : undefined;
});

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
