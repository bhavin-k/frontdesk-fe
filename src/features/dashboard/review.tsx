"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { ApplicationReview } from "@/features/recruitment/application-review";
import type { Upload } from "@/features/recruitment/types";
import { useBusiness } from "./business-context";
import {
  PageIntro,
  ErrorNotice,
  EmptyState,
  StatusBadge,
  useResource,
} from "./ui";
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
                {queue.data.applications.length > 0 && (
                  <section className="flex flex-col gap-4">
                    <h2 className="type-section-title">
                      {t("review.applications")}
                    </h2>
                    <TableCard>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("review.candidate")}</TableHead>
                            <TableHead>{t("candidates.status")}</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queue.data.applications.map((app) => (
                            <TableRow key={app.id}>
                              <TableCell>
                                {app.name ?? app.id.slice(0, 8)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge value={app.status} />
                              </TableCell>
                              <TableCell>
                                {app.upload_id && (
                                  <Button
                                    nativeButton={false}
                                    size="sm"
                                    variant="outline"
                                    render={
                                      <Link
                                        href={`/dashboard/review/${app.upload_id}`}
                                      />
                                    }
                                  >
                                    {t("review.view")}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableCard>
                  </section>
                )}
                {queue.data.uploads.length > 0 && (
                  <section className="flex flex-col gap-4">
                    <h2 className="type-section-title">
                      {t("review.failures")}
                    </h2>
                    <TableCard>
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
                                {upload.review_reason?.replaceAll("_", " ")}
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
                )}
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
  const upload = useResource<Upload>(`/cv-uploads/${id}`, { poll: true });
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
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
