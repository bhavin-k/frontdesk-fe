"use client";

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { StatusBadge } from "@/features/dashboard/ui";
import { recruitmentCopy as copy } from "@/lib/copy";
import { displayTime } from "./api";
import type { Evaluation, RoleAssessment } from "./types";

const numbers = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
export function EvaluationSummary({ evaluation, selected, onSelect }: {
  evaluation: Evaluation; selected: RoleAssessment | null; onSelect: (id: string) => void;
}) {
  const { t } = useTranslation("recruitment");
  return <div className="flex flex-col gap-6">
    <Card>
      <CardHeader><CardTitle><h2>{copy.aiRecommendation}</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {evaluation.state === "completed" ? <StatusBadge value={evaluation.recommendation} /> : <p role="status">{copy.processing}</p>}
        <p>{evaluation.reason}</p>
        <p>{t("evidenceConfidence", { value: evaluation.confidence === null ? copy.unavailable : `${numbers.format(evaluation.confidence * 100)}%` })}</p>
        <p className="text-sm text-muted-foreground">{copy.confidenceHint}</p>
      </CardContent>
    </Card>
    {evaluation.roles.length ? <Card>
      <CardHeader><CardTitle><h2>{copy.roleAssessment}</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup><Field>
          <FieldLabel htmlFor="assessed-role">{copy.assessedRole}</FieldLabel>
          <NativeSelect id="assessed-role" value={selected?.id ?? ""} onChange={(event) => onSelect(event.target.value)}>
            {evaluation.roles.map((role) => <NativeSelectOption key={role.id} value={role.id}>{role.opening_title}</NativeSelectOption>)}
          </NativeSelect>
        </Field></FieldGroup>
        {selected && <>
          <StatusBadge value={selected.recommendation} />
          <p>{selected.reason}</p>
          <p className="text-sm">{t("evidenceConfidence", { value: selected.confidence === null ? copy.unavailable : `${numbers.format(selected.confidence * 100)}%` })}</p>
          <p className="text-3xl font-semibold tabular-nums" data-testid="role-match-score">
            {selected.score !== null ? `${numbers.format(selected.score)}/100` : selected.eligibility.status === "failed" ? copy.experienceNotScored : copy.noScore}
          </p>
          {selected.score_provisional && <p className="text-sm text-muted-foreground">{copy.provisionalScore}</p>}
          <p className="text-sm">{copy.internshipsExcluded}</p>
          {selected.eligibility.status && <>
            <p className="text-sm">{selected.eligibility.reason}</p>
            <p className="text-sm">{t("experienceCounts", {
              professional: selected.eligibility.professional_months ?? 0,
              relevant: selected.eligibility.relevant_months ?? 0,
              totalRequired: selected.eligibility.required_total_months ?? 0,
              relevantRequired: selected.eligibility.required_relevant_months ?? 0,
            })}</p>
          </>}
          {(selected.eligibility.checks ?? []).map((check, index) => <p key={index} className="text-sm">{t("experienceCheck", {
            domain: check.domain ?? (check.kind === "total" ? copy.professionalExperience : copy.relevantExperience),
            counted: check.counted_months, required: check.required_months,
            status: t(`experienceStatus.${check.status}`),
          })}</p>)}
          <div className="flex flex-col gap-3">
            {(selected.eligibility.evidence ?? []).map((source) => <figure key={source.id} className="rounded-xl bg-muted p-4">
              <blockquote className="whitespace-pre-wrap text-sm leading-relaxed">{source.text}</blockquote>
              <figcaption className="mt-2 text-xs text-muted-foreground">{source.opening_id ? copy.jobRequirementSource : source.page === null ? copy.cvSource : t("cvSourcePage", { page: source.page })}</figcaption>
            </figure>)}
          </div>
        </>}
      </CardContent>
    </Card> : <p>{copy.noActiveRoles}</p>}
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-medium">{copy.evaluationDetails}</summary>
      {evaluation.processed_at && <p className="mt-3 text-sm">{displayTime(evaluation.processed_at)}</p>}
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">{JSON.stringify(evaluation.processing_config, null, 2)}</pre>
    </details>
  </div>;
}
