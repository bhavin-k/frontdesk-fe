"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Upload as UploadIcon } from "lucide-react";
import {
  PageIntro,
  ErrorNotice,
  EmptyState,
  StatusBadge,
  useResource,
} from "./ui";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/table";
import { MetricCardGridSkeleton } from "@/components/loading-skeletons";
import { useReviewSummary } from "./review-summary";
import { LatestCandidates } from "./latest-candidates";
import { authClient } from "@/lib/auth/client";
import { useOpeningDirectory } from "./opening-directory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CVUpload } from "@/features/recruitment/cv-upload";
import { useBusiness } from "./business-context";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
/** Status colours mark the three outcome counts; volume counts stay neutral. */
const metrics = [
  ["cvs_received", "received", ""],
  ["processed", "processed", ""],
  ["shortlisted", "shortlisted", "bg-success"],
  ["needs_review", "needsReview", "bg-warning"],
  ["rejected", "rejected", "bg-danger"],
] as const;
const numbers = new Intl.NumberFormat("en-IN");

function ReviewIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 150"
      className="hidden h-36 w-auto shrink-0 sm:block"
    >
      <rect
        x="50"
        y="22"
        width="100"
        height="118"
        rx="12"
        fill="#d9d9d9"
        transform="rotate(-8 100 81)"
      />
      <rect
        x="62"
        y="16"
        width="100"
        height="118"
        rx="12"
        fill="#e0e0e0"
        transform="rotate(6 112 75)"
      />
      <rect
        x="58"
        y="12"
        width="100"
        height="124"
        rx="12"
        fill="#ffffff"
        stroke="#cfcfcf"
      />
      <circle cx="82" cy="38" r="11" fill="#ededed" />
      <circle cx="82" cy="35" r="4" fill="#8a8a8a" />
      <rect x="100" y="31" width="44" height="6" rx="3" fill="#141414" />
      <rect x="100" y="42" width="30" height="5" rx="2.5" fill="#9a9a9a" />
      <rect x="72" y="64" width="74" height="5" rx="2.5" fill="#e4e4e4" />
      <rect x="72" y="76" width="60" height="9" rx="4.5" fill="#e6f4ea" />
      <rect x="72" y="92" width="70" height="5" rx="2.5" fill="#e4e4e4" />
      <rect x="72" y="104" width="48" height="5" rx="2.5" fill="#e4e4e4" />
      <circle cx="160" cy="118" r="20" fill="#141414" />
      <path
        d="M151 118l6 6 12-12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="116" r="8" fill="#9a9a9a" />
      <circle cx="186" cy="36" r="5" fill="#b5b5b5" />
    </svg>
  );
}

export function Overview() {
  const { t } = useTranslation("dashboard");
  const [opening, setOpening] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const { base } = useBusiness();
  const query = useQueryClient();
  const router = useRouter();
  const session = authClient.useSession();
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  const greeting =
    hour < 12 ? "goodMorning" : hour < 18 ? "goodAfternoon" : "goodEvening";
  const date = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(now);

  const overview = useResource<OverviewData>(
    `/overview${opening ? `?opening_id=${encodeURIComponent(opening)}` : ""}`,
    { poll: 30000 },
  );
  const unfiltered = useResource<OverviewData>("/overview");
  const openings = useOpeningDirectory();
  const openingMap = new Map(
    openings.data?.map((item) => [item.id, item]) ?? [],
  );
  const summary = useReviewSummary();
  const needsReview =
    !opening && summary.data
      ? summary.data.total
      : (overview.data?.totals.needs_review ?? 0);
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={
          session.data?.user.name
            ? t(`design.${greeting}`, {
                name: session.data.user.name.split(" ")[0],
              })
            : t("overview.title")
        }
        description={
          unfiltered.data
            ? `${date}. ${t("design.overviewDescription", { count: unfiltered.data.by_opening.length })}`
            : t("overview.description")
        }
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <NativeSelect
          aria-label={t("overview.openingFilter")}
          value={opening}
          onChange={(event) => setOpening(event.target.value)}
          className="min-w-56"
        >
          <NativeSelectOption value="">
            {t("overview.allOpenings")}
          </NativeSelectOption>
          {unfiltered.data?.by_opening.map((row) => (
            <NativeSelectOption key={row.opening_id} value={row.opening_id}>
              {row.title}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <UploadIcon />
          {t("design.upload")}
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/dashboard/openings/new" />}
        >
          <Plus />
          {t("openings.create")}
        </Button>
      </div>
      {overview.error && (
        <ErrorNotice
          error={overview.error}
          retry={() => void overview.refetch()}
        />
      )}
      {overview.isPending ? (
        <MetricCardGridSkeleton count={5} />
      ) : (
        overview.data && (
          <>
            {needsReview > 0 && (
              <section className="flex items-center gap-6 rounded-[20px] bg-muted px-6 py-10 md:px-8">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {t("overview.attentionTitle", { count: needsReview })}
                  </h2>
                  {!opening && summary.data && (
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          [
                            "recommendationCount",
                            summary.data.applications,
                            "bg-success",
                          ],
                          ["failureCount", summary.data.uploads, "bg-warning"],
                          [
                            "identityCount",
                            summary.data.identities,
                            "bg-neutral",
                          ],
                        ] as const
                      ).map(
                        ([label, count, tone]) =>
                          count > 0 && (
                            <span
                              key={label}
                              className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm"
                            >
                              <span className={`size-2 rounded-full ${tone}`} />
                              {t(`design.${label}`, { count })}
                            </span>
                          ),
                      )}
                    </div>
                  )}
                  <p className="max-w-prose text-sm text-muted-foreground">
                    {t("overview.attentionDescription")}
                  </p>
                  <div className="flex flex-wrap items-center gap-6">
                    <Button
                      size="lg"
                      nativeButton={false}
                      render={<Link href="/dashboard/review" />}
                    >
                      {t("overview.viewReview")}
                    </Button>
                    <Link
                      href="/dashboard/candidates"
                      className="text-sm font-semibold underline"
                    >
                      {t("design.allCandidates")}
                    </Link>
                  </div>
                </div>
                <ReviewIllustration />
              </section>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map(([key, label]) => (
                <div
                  key={key}
                  className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-5"
                >
                  <span className="text-sm text-muted-foreground">
                    {t(`overview.${label}`)}
                  </span>
                  <span
                    className="text-3xl font-semibold tabular-nums"
                    data-testid={`metric-${key}`}
                  >
                    {numbers.format(overview.data!.totals[key])}
                  </span>
                  {["shortlisted", "needs_review", "rejected"].includes(
                    key,
                  ) && <StatusBadge value={key} />}
                </div>
              ))}
            </div>
            {!overview.data.totals.cvs_received && (
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
                  </Button>
                }
              />
            )}
            {overview.data.by_opening.length > 0 && (
              <section className="rounded-[20px] border bg-card p-5 md:p-6">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {t("overview.byOpening")}
                  </h2>
                  <Link
                    className="text-sm font-medium underline"
                    href="/dashboard/openings"
                  >
                    {t("design.viewAll")}
                  </Link>
                </div>
                <Table>
                  <TableHeader className="bg-transparent">
                    <TableRow>
                      <TableHead>{t("overview.opening")}</TableHead>
                      <TableHead>{t("openings.status")}</TableHead>
                      {metrics.map(([, label]) => (
                        <TableHead key={label} className="text-right">
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
                            className="font-semibold hover:underline"
                            href={`/dashboard/openings/${row.opening_id}`}
                          >
                            {row.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {openingMap.get(row.opening_id) && (
                            <StatusBadge
                              value={openingMap.get(row.opening_id)!.status}
                            />
                          )}
                        </TableCell>
                        {metrics.map(([key]) => (
                          <TableCell
                            key={key}
                            className="text-right tabular-nums"
                          >
                            {numbers.format(row.counts[key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            )}
            <LatestCandidates opening={opening} />
            <p className="text-xs leading-5 text-muted-foreground">
              {t("overview.retained")}
            </p>
          </>
        )
      )}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="frontdesk-dashboard">
          <DialogHeader>
            <DialogTitle>{t("design.chooseUpload")}</DialogTitle>
          </DialogHeader>
          <NativeSelect
            aria-label={t("overview.openingFilter")}
            value={opening}
            onChange={(event) => setOpening(event.target.value)}
          >
            <NativeSelectOption value="">
              {t("overview.opening")}
            </NativeSelectOption>
            {openings.data
              ?.filter((item) => item.status === "active")
              .map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.title}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          {base && openingMap.get(opening)?.status === "active" && (
            <CVUpload
              base={base}
              openingId={opening}
              onUploaded={(upload) => {
                setUploadOpen(false);
                void query.invalidateQueries({ queryKey: ["recruitment"] });
                router.push(`/dashboard/review/${upload.upload_id}`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
