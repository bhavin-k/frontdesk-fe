"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { recruitmentCopy as copy } from "@/lib/copy";
import { api, displayTime, isProcessing } from "./api";
import { CandidateContactDetails } from "./candidate-contact-details";
import type { Application, Match, MatchResponse, Upload, Evaluation } from "./types";
import { DecisionForm } from "./decision-form";
import { EvaluationSummary } from "./evaluation-summary";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { StatusBadge } from "@/features/dashboard/ui";

export function ApplicationReview({
  base,
  upload,
  refresh,
  onSaved,
}: {
  base: string;
  upload: Upload;
  refresh: number;
  onSaved: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const [detail, setDetail] = useState<{
    application: Application;
    match: Match | null;
    evaluation: Evaluation | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!upload.application_id) return () => controller.abort();
    Promise.all([
      api<Application>(
        `${base}/applications/${upload.application_id}`,
        {},
        controller.signal,
      ),
      api<MatchResponse>(
        `${base}/applications/${upload.application_id}/match-results`,
        {},
        controller.signal,
      ),
    ])
      .then(([application, result]) => {
        setDetail({ application, match: result.result, evaluation: result.evaluation });
        setError("");
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [base, upload.application_id, upload.status, refresh, retry]);
  const [assessmentId, setAssessmentId] = useState("");
  const evaluation = detail?.evaluation ?? null;
  const selectedRole =
    evaluation?.roles.find((role) => role.id === assessmentId) ??
    evaluation?.roles.find((role) => role.id === evaluation.recommended_assessment_id) ??
    evaluation?.roles[0] ??
    null;
  const match = detail?.match;
  const legacyMatch = !evaluation && match && "match_run_id" in match ? match : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span data-testid="upload-status" data-upload-id={upload.upload_id}>
          <StatusBadge value={upload.status} />
        </span>
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={
            <a
              href={`/api/recruitment${base}/cv-uploads/${upload.upload_id}/file`}
              download
              aria-label={t("intake:original")}
            />
          }
        >
          {t("intake:original")}
        </Button>
      </div>
      {isProcessing(upload.status) && (
        <Alert>
          <AlertDescription role="status">{copy.processing}</AlertDescription>
        </Alert>
      )}
      {upload.status === "needs_review" && (
        <Alert>
          <AlertDescription>
            {copy.failure}
            {upload.review_reason && (
              <p className="mt-2 text-sm">
                {copy.reviewReason}:{" "}
                {copy.failureReasons[
                  upload.review_reason as keyof typeof copy.failureReasons
                ] ?? copy.failureReasons.default}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <Button variant="outline" onClick={() => setRetry(retry + 1)}>
              {copy.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {upload.application_id && !detail && !error && (
        <TableCardSkeleton columns={3} />
      )}
      {detail && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{copy.profile}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">
                {detail.application.profile.name || copy.unknownName}
              </h2>
              <CandidateContactDetails profile={detail.application.profile} />
              {detail.application.candidate_id && (
                <Button
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  render={
                    <Link
                      href={`/dashboard/candidates/${detail.application.candidate_id}`}
                    />
                  }
                >
                  {t("candidates.view")}
                </Button>
              )}
              {evaluation && !detail.application.recruiter_decision
                ? <p className="text-sm">{copy.awaitingDecision}</p>
                : <StatusBadge value={detail.application.status} />}
              {detail.application.recruiter_decision && <div className="flex flex-col gap-2">
                <p className="text-sm">{copy.savedRecruiterDecision}</p>
                <p>{detail.application.recruiter_decision.decision === "shortlist" ? copy.selectCandidate : copy.reject}</p>
                <p className="text-xs text-muted-foreground">{displayTime(detail.application.recruiter_decision.saved_at)}</p>
              </div>}
            </CardContent>
          </Card>
          {evaluation && <EvaluationSummary evaluation={evaluation} selected={selectedRole} onSelect={setAssessmentId} />}
          {legacyMatch && (
            <Card>
              <CardHeader>
                <CardTitle>{copy.score}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-3xl font-semibold tabular-nums">
                  {legacyMatch.score === null ? copy.noScore : legacyMatch.score + "/100"}
                </p>
                <StatusBadge value={legacyMatch.recommendation} />
                <p>{legacyMatch.reason}</p>
              </CardContent>
            </Card>
          )}
          <p className="text-xs text-muted-foreground">
            {copy.retention}:{" "}
            {displayTime(detail.application.retention_expires_at)}
          </p>
          <Separator />
          {detail.application.status === "rejected" ? (
            <Alert>
              <AlertDescription>{copy.rejected}</AlertDescription>
            </Alert>
          ) : (
            (evaluation || legacyMatch) && (
              <DecisionForm
                key={`${detail.application.id}:${evaluation?.id ?? legacyMatch?.match_run_id}:${detail.application.version}`}
                base={base}
                application={detail.application}
                match={legacyMatch}
                evaluation={evaluation}
                assessmentId={selectedRole?.id ?? null}
                onSaved={onSaved}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
