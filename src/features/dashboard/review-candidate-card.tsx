"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationReview } from "@/features/recruitment/application-review";
import type { MatchResponse, Upload } from "@/features/recruitment/types";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "./business-context";
import { ErrorNotice, StatusBadge, useResource } from "./ui";
import { CandidateAvatar } from "./latest-candidates";

export function ReviewCandidateCard({
  application,
}: {
  application: {
    id: string;
    name: string | null;
    status: string;
    upload_id: string | null;
  };
}) {
  const { t } = useTranslation("dashboard");
  const assessment = useResource<MatchResponse>(
    `/applications/${application.id}/match-results`,
  );
  const evaluation = assessment.data?.evaluation;
  const role =
    evaluation?.roles.find(
      (item) => item.id === evaluation.recommended_assessment_id,
    ) ?? evaluation?.roles[0];
  const legacy = assessment.data?.result;
  const score = role
    ? role.score
    : legacy && "score" in legacy
      ? legacy.score
      : null;
  const [decision, setDecision] = useState<"shortlist" | "reject" | null>(null);
  return (
    <article className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card px-5 py-5">
      <CandidateAvatar name={application.name ?? "?"} />
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm">
          <span className="font-semibold">
            {application.name ?? t("candidates.unknown")}
          </span>
          {role && (
            <span className="ml-2 text-muted-foreground">
              {role.opening_title}
            </span>
          )}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {role?.reason ?? evaluation?.reason ?? legacy?.reason}
        </p>
        {assessment.error && (
          <ErrorNotice
            error={assessment.error}
            retry={() => void assessment.refetch()}
          />
        )}
      </div>
      <div className="flex min-w-40 flex-col items-start gap-1">
        <StatusBadge value={role?.recommendation ?? application.status} />
        <span className="text-sm font-semibold">
          {score == null
            ? t("candidates.noScore")
            : `${t("candidates.score")} ${score}/100`}
        </span>
      </div>
      {application.upload_id && (
        <div className="flex items-center gap-2">
          <Button onClick={() => setDecision("shortlist")}>
            {t("design.shortlist")}
          </Button>
          <Button variant="outline" onClick={() => setDecision("reject")}>
            {t("design.reject")}
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="icon"
            aria-label={t("review.view")}
            render={
              <Link href={`/dashboard/review/${application.upload_id}`} />
            }
          >
            <ChevronRight />
          </Button>
        </div>
      )}
      <Dialog
        open={!!decision}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
      >
        <DialogContent className="frontdesk-dashboard max-h-[90svh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {t("review.view")} · {application.name ?? t("candidates.unknown")}
            </DialogTitle>
          </DialogHeader>
          {decision && application.upload_id && (
            <QueueDecision
              uploadId={application.upload_id}
              decision={decision}
            />
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}

function QueueDecision({
  uploadId,
  decision,
}: {
  uploadId: string;
  decision: "shortlist" | "reject";
}) {
  const { base } = useBusiness();
  const query = useQueryClient();
  const upload = useResource<Upload>(`/cv-uploads/${uploadId}`);
  const [refresh, setRefresh] = useState(0);
  if (upload.error) return <ErrorNotice error={upload.error} />;
  return (
    upload.data &&
    base && (
      <ApplicationReview
        base={base}
        upload={upload.data}
        refresh={refresh}
        initialDecision={decision}
        onSaved={() => {
          setRefresh((value) => value + 1);
          void query.invalidateQueries({ queryKey: ["recruitment"] });
        }}
      />
    )
  );
}
