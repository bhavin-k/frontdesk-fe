"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  PageIntro,
  useResource,
  ErrorNotice,
  EmptyState,
  StatusBadge,
} from "./ui";
import { useBusiness } from "./business-context";
import { ListPagination } from "./openings";
import { displayTime } from "@/features/recruitment/api";
import type { Page } from "@/features/recruitment/types";
import type {
  IntakeRecord,
  IdentityCase,
} from "@/features/recruitment/intake/types";
import { IdentityReviews } from "@/features/recruitment/intake/identity-reviews";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCard,
} from "@/components/ui/table";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { useRouter } from "next/navigation";

export function EmailIntakePage() {
  const { t } = useTranslation(["dashboard", "intake"]);
  const [offset, setOffset] = useState(0);
  const intake = useResource<Page<IntakeRecord>>(
    `/mail-intake?limit=20&offset=${offset}`,
    { poll: true },
  );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("dashboard:integrations.emailIntake")}
        description={t("intake:connectionHelp")}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/integrations" />}
          >
            {t("dashboard:integrations.title")}
          </Button>
        }
      />
      {intake.error && <ErrorNotice error={intake.error} />}
      {intake.isPending ? (
        <TableCardSkeleton />
      ) : intake.data?.items.length ? (
        <>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recruitment:cvFile")}</TableHead>
                  <TableHead>{t("intake:received")}</TableHead>
                  <TableHead>{t("dashboard:candidates.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {intake.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-64 whitespace-normal break-all">
                      <span className="font-medium">{item.filename}</span>
                      <p className="text-xs text-muted-foreground">
                        {item.provider}
                      </p>
                    </TableCell>
                    <TableCell>{displayTime(item.received_at)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        value={item.processing_status ?? item.status}
                      />
                      {item.failure_code && (
                        <p className="mt-1 text-xs text-destructive">
                          {item.failure_code.replaceAll("_", " ")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.upload_id && (
                        <Button
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                          render={
                            <Link
                              href={`/dashboard/review/${item.upload_id}`}
                            />
                          }
                        >
                          {t("dashboard:review.view")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <ListPagination
            offset={offset}
            count={intake.data.items.length}
            onChange={setOffset}
          />
        </>
      ) : (
        <EmptyState
          title={t("intake:intake")}
          description={t("intake:emptyIntake")}
        />
      )}
    </div>
  );
}

export function IdentityReviewsPage() {
  const { t } = useTranslation("intake");
  const { base } = useBusiness();
  const query = useQueryClient();
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const reviews = useResource<Page<IdentityCase>>(
    `/identity-reviews?limit=20&offset=${offset}`,
    { poll: true },
  );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro title={t("identityReviews")} description={t("identityHelp")} />
      {reviews.error && <ErrorNotice error={reviews.error} />}
      {reviews.isPending ? (
        <TableCardSkeleton />
      ) : (
        base &&
        reviews.data && (
          <>
            <IdentityReviews
              base={base}
              rows={reviews.data.items}
              onChanged={() => {
                void query.invalidateQueries({ queryKey: ["recruitment"] });
              }}
              onOpenUpload={(id) => router.push(`/dashboard/review/${id}`)}
            />
            <ListPagination
              offset={offset}
              count={reviews.data.items.length}
              onChange={setOffset}
            />
          </>
        )
      )}
    </div>
  );
}
