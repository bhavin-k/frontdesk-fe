import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";
import { publicAuthResponse } from "@/lib/auth/public-response";
import { isAuthConnectionError } from "@/lib/auth/connection-errors";

export const runtime = "nodejs";

async function handle(request: Request, method: "GET" | "POST") {
  try {
    return await publicAuthResponse(
      await toNextJsHandler(await getAuth())[method](request),
    );
  } catch (error) {
    if (!isAuthConnectionError(error)) throw error;
    console.error("Frontdesk authentication database is temporarily unavailable.");
    return Response.json(
      { code: "AUTH_UNAVAILABLE", message: "Authentication is temporarily unavailable. Retry shortly." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3" } },
    );
  }
}

export async function GET(request: Request) {
  return handle(request, "GET");
}

export async function POST(request: Request) {
  return handle(request, "POST");
}
