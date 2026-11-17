import { forwardMailboxWebhook } from "@/lib/recruitment/webhook-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forwardMailboxWebhook(request, path, {
    baseURL: process.env.RECRUITMENT_API_BASE_URL,
  });
}
