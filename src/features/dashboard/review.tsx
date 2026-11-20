"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ReviewCandidateCard } from "./review-candidate-card";
import { ArrowLeft } from "lucide-react";
import { ApplicationReview } from "@/features/recruitment/application-review";
import { isProcessing } from "@/features/recruitment/api";
import type { Upload } from "@/features/recruitment/types";
import { recruitmentCopy } from "@/lib/copy";
import { useBusiness } from "./business-context";
import { PageIntro, ErrorNotice, EmptyState, useResource } from "./ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableCard,
} from "@/components/ui/table";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { ListPagination } from "./openings";

type Queue = {
  uploads: Upload[];
  applications: {
    id: string;
    candidate_id: string;
    name: string | null;
    upload_id: string | null;
    status: string;
  }[];
  identity_review_ids: string[];
};
export function ReviewQueuePage() {
  const { t } = useTranslation("dashboard");
  const [offset, setOffset] = useState(0);
  const queue = useResource<Queue>(`/review-queue?limit=20&offset=${offset}`, {
    poll: true,
  });
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("review.title")}
        description={t("review.description")}
      />
      {queue.error && (
        <ErrorNotice
          error={queue.error}
          retry={() => {
            void queue.refetch();
          }}
        />
      )}
      {queue.isPending ? (
        <TableCardSkeleton />
      ) : (
        queue.data && (
          <>
            {!queue.data.uploads.length &&
            !queue.data.applications.length &&
            !queue.data.identity_review_ids.length ? (
              <EmptyState
                title={t("review.empty")}
                description={t("review.emptyDescription")}
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      [
                        "applications",
                        queue.data.applications.length,
                        "text-foreground",
                      ],
                      ["failures", queue.data.uploads.length, "text-warning"],
                      [
                        "identity",
                        queue.data.identity_review_ids.length,
                        "text-foreground",
                      ],
                    ] as const
                  ).map(([key, count, tone]) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-4"
                    >
                      <span
                        className={`text-3xl font-semibold tabular-nums ${tone}`}
                      >
                        {count}
                      </span>
                      <div>
                        <span className="text-sm font-semibold">
                          {t(`review.${key}`)}
                        </span>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t(
                            `design.${key === "applications" ? "confirmOverrule" : key === "failures" ? "manualCheck" : "identityHint"}`,
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {queue.data.applications.length > 0 && (
                  <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="type-section-title">
                        {t("design.recommendations")}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {t("design.oldestFirst")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {queue.data.applications.map((app) => (
                        <ReviewCandidateCard key={app.id} application={app} />
                      ))}
                    </div>
                  </section>
                )}
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  {queue.data.uploads.length > 0 && (
                    <section className="flex min-w-0 flex-col gap-4 rounded-[20px] border bg-card p-6">
                      <h2 className="text-lg font-semibold">
                        {t("review.failures")}
                      </h2>
                      <TableCard className="border-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("recruitment:cvFile")}</TableHead>
                              <TableHead>{t("review.reason")}</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queue.data.uploads.map((upload) => (
                              <TableRow key={upload.upload_id}>
                                <TableCell>
                                  <code>{upload.upload_id.slice(0, 8)}</code>
                                </TableCell>
                                <TableCell>
                                  {(upload.review_reason &&
                                    recruitmentCopy.failureReasons[
                                      upload.review_reason as keyof typeof recruitmentCopy.failureReasons
                                    ]) ??
                                    upload.review_reason?.replaceAll("_", " ")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    nativeButton={false}
                                    size="sm"
                                    variant="outline"
                                    render={
                                      <Link
                                        href={`/dashboard/review/${upload.upload_id}`}
                                      />
                                    }
                                  >
                                    {t("review.view")}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCard>
                    </section>
                  )}
                  {queue.data.identity_review_ids.length > 0 && (
                    <section className="rounded-[20px] border bg-card p-6">
                      <h2 className="mb-3 text-lg font-semibold">
                        {t("review.identity")}
                      </h2>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {t("design.identityHint")}
                      </p>
                      <Button
                        nativeButton={false}
                        className="w-fit"
                        variant="outline"
                        render={
                          <Link href="/dashboard/candidates/identity-reviews" />
                        }
                      >
                        {t("review.identity")} (
                        {queue.data.identity_review_ids.length})
                      </Button>
                    </section>
                  )}
                </div>
              </>
            )}
            <ListPagination
              offset={offset}
              count={Math.max(
                queue.data.uploads.length,
                queue.data.applications.length,
                queue.data.identity_review_ids.length,
              )}
              onChange={setOffset}
            />
          </>
        )
      )}
    </div>
  );
}

export function ReviewDetailPage({ id }: { id: string }) {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const query = useQueryClient();
  const [refresh, setRefresh] = useState(0);
  const upload = useResource<Upload>(`/cv-uploads/${id}`, {
    poll: (data) => !data || isProcessing(data.status),
  });
  return (
    <div className="flex w-full flex-col gap-6">
      <PageIntro
        title={t("review.view")}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/review" />}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("review.title")}
          </Button>
        }
      />
      {upload.error && (
        <ErrorNotice
          error={upload.error}
          retry={() => {
            void upload.refetch();
          }}
        />
      )}
      {upload.isPending ? (
        <TableCardSkeleton />
      ) : (
        upload.data &&
        base && (
          <ApplicationReview
            key={upload.data.upload_id}
            base={base}
            upload={upload.data}
            refresh={refresh}
            onSaved={() => {
              setRefresh((value) => value + 1);
              void query.invalidateQueries({ queryKey: ["recruitment"] });
            }}
          />
        )
      )}
    </div>
  );
}
