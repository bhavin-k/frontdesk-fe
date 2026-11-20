"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  api,
  candidatePagePath,
  displayTime,
  recruitmentQueryKey,
} from "@/features/recruitment/api";
import { useQuery } from "@tanstack/react-query";
import { useBusiness } from "./business-context";
import type { Page } from "@/features/recruitment/types";
import type { CandidateSummary } from "@/features/recruitment/intake/types";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ErrorNotice, StatusBadge } from "./ui";

export function CandidateAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
    >
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}

export function LatestCandidates({ opening }: { opening: string }) {
  const { t } = useTranslation("dashboard");
  const { base, userId } = useBusiness();
  const candidates = useQuery({
    queryKey: recruitmentQueryKey(userId, base, `latest-candidates:${opening}`),
    enabled: !!base,
    refetchInterval: 30000,
    queryFn: async ({ signal }) => {
      const matching: CandidateSummary[] = [];
      let offset = 0;
      for (;;) {
        const page = await api<Page<CandidateSummary>>(
          `${base}${candidatePagePath(offset)}`,
          {},
          signal,
        );
        matching.push(
          ...page.items.filter(
            (candidate) => !opening || candidate.opening_id === opening,
          ),
        );
        if (matching.length >= 5 || page.items.length < (page.limit || 20))
          return matching.slice(0, 5);
        offset += page.items.length;
      }
    },
  });
  const rows = candidates.data ?? [];
  return (
    <section className="rounded-[20px] border bg-card p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {t("design.latestCandidates")}
        </h2>
        <Link
          href="/dashboard/candidates"
          className="text-sm font-medium underline"
        >
          {t("design.allCandidates")}
        </Link>
      </div>
      {candidates.error ? (
        <ErrorNotice error={candidates.error} />
      ) : (
        <Table>
          <TableHeader className="bg-transparent">
            <TableRow>
              <TableHead>{t("candidates.name")}</TableHead>
              <TableHead>{t("candidates.opening")}</TableHead>
              <TableHead>{t("candidates.score")}</TableHead>
              <TableHead>{t("candidates.status")}</TableHead>
              <TableHead className="text-right">
                {t("design.received")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/candidates/${candidate.id}`}
                    className="flex items-center gap-3 font-medium hover:underline"
                  >
                    <CandidateAvatar name={candidate.profile.name ?? "?"} />
                    {candidate.profile.name ?? t("candidates.unknown")}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {candidate.opening_title ?? t("candidates.noMatchingOpening")}
                </TableCell>
                <TableCell className="font-semibold tabular-nums">
                  {candidate.score === null
                    ? t("candidates.noScore")
                    : `${candidate.score}/100`}
                </TableCell>
                <TableCell>
                  <StatusBadge value={candidate.status} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {candidate.current_source_at
                    ? displayTime(candidate.current_source_at)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!rows.length && !candidates.error && (
        <p className="py-5 text-sm text-muted-foreground">
          {t(candidates.isPending ? "table.loading" : "candidates.empty")}
        </p>
      )}
    </section>
  );
}
