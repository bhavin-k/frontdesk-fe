"use client";

import { useQuery } from "@tanstack/react-query";
import { api, recruitmentQueryKey } from "@/features/recruitment/api";
import type { Opening, Page } from "@/features/recruitment/types";
import { useBusiness } from "./business-context";

/** Load each page so title/location filtering and status counts cover the directory. */
export function useOpeningDirectory() {
  const { base, userId } = useBusiness();
  return useQuery({
    queryKey: recruitmentQueryKey(userId, base, "opening-directory"),
    enabled: !!base,
    queryFn: async ({ signal }) => {
      const items: Opening[] = [];
      let offset = 0;
      for (;;) {
        const page = await api<Page<Opening>>(
          `${base}/openings?limit=100&offset=${offset}`,
          {},
          signal,
        );
        items.push(...page.items);
        if (!page.items.length || page.items.length < (page.limit || 100))
          return items;
        offset += page.items.length;
      }
    },
  });
}
