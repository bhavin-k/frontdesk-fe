"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { recruitmentCopy as copy } from "@/lib/copy";
import { api, displayTime, isProcessing } from "./api";
import type { Application, Match, MatchResponse, Upload, Evaluation, AssessmentDetail } from "./types";
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
  const [loadedAssessment, setLoadedAssessment] = useState<{ id: string; result: Match | null } | null>(null);
  const evaluation = detail?.evaluation ?? null;
  const selectedRole = evaluation?.roles.find((role) => role.id === assessmentId)
    ?? evaluation?.roles.find((role) => role.id === evaluation.recommended_assessment_id)
    ?? evaluation?.roles[0] ?? null;
  const selectedId = selectedRole?.id ?? null;
  const appId = detail?.application.id;
  const initialMatch = detail?.match;
  const selectedMatchId = selectedRole?.match_run_id;
  useEffect(() => {
    if (!evaluation || !selectedId || !appId || initialMatch?.match_run_id === selectedMatchId) return;
    const controller = new AbortController();
    api<AssessmentDetail>(`${base}/applications/${appId}/role-assessments/${selectedId}`, {}, controller.signal)
      .then((value) => { if (!controller.signal.aborted) setLoadedAssessment({ id: selectedId, result: value.result }); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [base, appId, selectedId, selectedMatchId, evaluation, initialMatch]);
  const match = evaluation ? (initialMatch?.match_run_id === selectedMatchId ? initialMatch
    : loadedAssessment?.id === selectedId ? loadedAssessment.result : null) : initialMatch;
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
                {detail.application.profile.name ?? copy.unknownName}
              </h2>
              <p className="text-sm">{detail.application.profile.email}</p>
              <p className="text-sm">{detail.application.profile.mobile}</p>
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
          {match && (
            <>
              {!evaluation && <Card>
                <CardHeader>
                  <CardTitle>{copy.score}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-4xl font-semibold tabular-nums">
                    {match.score === null ? copy.noScore : `${match.score}%`}
                  </p>
                  <StatusBadge value={match.recommendation} />
                  <p className="text-sm text-muted-foreground">
                    {match.reason}
                  </p>
                </CardContent>
              </Card>}
              <section className="flex flex-col gap-4">
                <h2 className="type-section-title">{copy.evidence}</h2>
                {match.criteria.map((grade) => (
                  <Card key={grade.criterion_id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {grade.criterion}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <StatusBadge value={grade.status} />
                      <p className="text-sm">{grade.reason}</p>
                      {grade.evidence.length ? (
                        grade.evidence.map((evidence, index) => (
                          <figure
                            key={`${"chunk_id" in evidence ? evidence.chunk_id : evidence.source_id}:${index}`}
                            className="rounded-xl bg-muted p-4"
                          >
                            <blockquote className="whitespace-pre-wrap text-sm leading-relaxed">
                              {evidence.quote}
                            </blockquote>
                            <figcaption className="mt-3 text-xs text-muted-foreground">
                              {"chunk_id" in evidence ? (
                                <>
                                  {copy.chunk}: <code>{evidence.chunk_id}</code>
                                  {evidence.source_spans.some(
                                    (span) => span.page !== null,
                                  ) && (
                                    <>
                                      {" "}· {copy.page}{" "}
                                      {[
                                        ...new Set(
                                          evidence.source_spans
                                            .map((span) => span.page)
                                            .filter((page) => page !== null),
                                        ),
                                      ].join(", ")}
                                    </>
                                  )}
                                </>
                              ) : (
                                evidence.page === null ? copy.documentText : `${copy.page} ${evidence.page}`
                              )}
                            </figcaption>
                          </figure>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {copy.noEvidence}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </section>
              <details className="rounded-xl border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {copy.provenance}
                </summary>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[12rem_1fr]">
                  <dt>{copy.provider}</dt>
                  <dd>{match.provider}</dd>
                  <dt>{copy.model}</dt>
                  <dd>{match.model}</dd>
                  <dt>{copy.prompt}</dt>
                  <dd>{match.prompt_version}</dd>
                  {match.embedding_model && (
                    <>
                      <dt>{copy.embedding}</dt>
                      <dd>{match.embedding_model} · {match.embedding_dimensions}</dd>
                    </>
                  )}
                  <dt>{copy.processed}</dt>
                  <dd>{displayTime(match.processed_at)}</dd>
                </dl>
                <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                  {JSON.stringify(match.processing_config, null, 2)}
                </pre>
              </details>
            </>
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
            (evaluation || match) && (
              <DecisionForm
                key={`${detail.application.id}:${evaluation?.id ?? match?.match_run_id}:${detail.application.version}`}
                base={base}
                application={detail.application}
                match={match ?? null}
                evaluation={evaluation}
                assessmentId={selectedId}
                onSaved={onSaved}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
