import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";
import { publicAuthResponse } from "@/lib/auth/public-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return publicAuthResponse(
    await toNextJsHandler(await getAuth()).GET(request),
  );
}

export async function POST(request: Request) {
  return publicAuthResponse(
    await toNextJsHandler(await getAuth()).POST(request),
  );
}
