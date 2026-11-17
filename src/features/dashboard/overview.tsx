"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  ArrowUpRight,
  FileText,
  CircleCheck,
  Users,
  ClipboardCheck,
  UserX,
} from "lucide-react";
import { PageIntro, ErrorNotice, EmptyState, useResource } from "./ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableCard,
} from "@/components/ui/table";
import {
  MetricCardGridSkeleton,
  ChartBlockSkeleton,
} from "@/components/loading-skeletons";

type Counts = {
  cvs_received: number;
  processed: number;
  shortlisted: number;
  needs_review: number;
  rejected: number;
};
export type OverviewData = {
  totals: Counts;
  by_opening: { opening_id: string; title: string; counts: Counts }[];
  daily_intake: { date: string; cvs_received: number }[];
  scope: string;
};
const Charts = dynamic(
  () => import("./overview-charts").then((module) => module.OverviewCharts),
  { loading: () => <ChartBlockSkeleton /> },
);
const metrics = [
  ["cvs_received", "received", FileText],
  ["processed", "processed", CircleCheck],
  ["shortlisted", "shortlisted", Users],
  ["needs_review", "needsReview", ClipboardCheck],
  ["rejected", "rejected", UserX],
] as const;

export function Overview() {
  const { t } = useTranslation("dashboard");
  const [opening, setOpening] = useState("");
  const overview = useResource<OverviewData>(
    `/overview${opening ? `?opening_id=${encodeURIComponent(opening)}` : ""}`,
    { poll: true },
  );
  const unfiltered = useResource<OverviewData>("/overview");
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("overview.title")}
        description={t("overview.description")}
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/openings" />}
          >
            <Plus data-icon="inline-start" />
            {t("openings.create")}
          </Button>
        }
      />
      {overview.error && (
        <ErrorNotice
          error={overview.error}
          retry={() => {
            void overview.refetch();
          }}
        />
      )}
      {overview.isPending ? (
        <MetricCardGridSkeleton count={5} />
      ) : (
        overview.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t("overview.retained")}
              </p>
              <NativeSelect
                aria-label={t("overview.openingFilter")}
                value={opening}
                onChange={(event) => setOpening(event.target.value)}
              >
                <NativeSelectOption value="">
                  {t("overview.allOpenings")}
                </NativeSelectOption>
                {unfiltered.data?.by_opening.map((row) => (
                  <NativeSelectOption
                    key={row.opening_id}
                    value={row.opening_id}
                  >
                    {row.title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map(([key, label, Icon]) => (
                <Card key={key} size="sm">
                  <CardHeader>
                    <CardDescription className="flex items-center justify-between gap-2">
                      {t(`overview.${label}`)}
                      <Icon className="size-4" />
                    </CardDescription>
                    <CardTitle
                      className="text-3xl tabular-nums"
                      data-testid={`metric-${key}`}
                    >
                      {new Intl.NumberFormat("en-IN").format(
                        overview.data!.totals[key],
                      )}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            {overview.data.totals.cvs_received ? (
              <Charts data={overview.data} />
            ) : (
              <EmptyState
                title={t("overview.recruitmentFlow")}
                description={t("overview.noData")}
                action={
                  <Button
                    nativeButton={false}
                    variant="outline"
                    render={<Link href="/dashboard/openings" />}
                  >
                    {t("overview.start")}
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                }
              />
            )}
            {overview.data.by_opening.length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="type-section-title">
                  {t("overview.byOpening")}
                </h2>
                <TableCard>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("overview.opening")}</TableHead>
                        {metrics.map(([, label]) => (
                          <TableHead key={label}>
                            {t(`overview.${label}`)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.data.by_opening.map((row) => (
                        <TableRow key={row.opening_id}>
                          <TableCell>
                            <Link
                              className="font-medium hover:underline"
                              href={`/dashboard/openings/${row.opening_id}`}
                            >
                              {row.title}
                            </Link>
                          </TableCell>
                          {metrics.map(([key]) => (
                            <TableCell key={key} className="tabular-nums">
                              {row.counts[key]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableCard>
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
