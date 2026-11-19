import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // This hint only selects a read flow. Session and tenant checks remain mandatory.
  headers.set("x-frontdesk-initial-view",
    request.nextUrl.pathname === "/dashboard/candidates" ? "candidates" : "standard");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/dashboard/:path*" };
