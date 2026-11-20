"use client";
import { useQuery } from "@tanstack/react-query";
import { api, recruitmentQueryKey } from "@/features/recruitment/api";
import { useBusiness } from "./business-context";

export function useReviewSummary() {
  const { base, userId } = useBusiness();
  return useQuery({
    queryKey: recruitmentQueryKey(userId, base, "review-summary"),
    enabled: !!base,
    refetchInterval: 30000,
    queryFn: async ({ signal }) => {
      const counts = { applications: 0, uploads: 0, identities: 0, total: 0 };
      let offset = 0;
      for (;;) {
        const page = await api<{
          applications: unknown[];
          uploads: unknown[];
          identity_review_ids: string[];
          limit?: number;
        }>(`${base}/review-queue?limit=100&offset=${offset}`, {}, signal);
        counts.applications += page.applications.length;
        counts.uploads += page.uploads.length;
        counts.identities += page.identity_review_ids.length;
        counts.total = counts.applications + counts.uploads + counts.identities;
        const received = Math.max(
          page.applications.length,
          page.uploads.length,
          page.identity_review_ids.length,
        );
        if (received < (page.limit || 100)) return counts;
        offset += received;
      }
    },
  });
}
