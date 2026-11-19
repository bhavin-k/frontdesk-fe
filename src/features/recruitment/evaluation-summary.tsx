"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { StatusBadge } from "@/features/dashboard/ui";
import { recruitmentCopy as copy } from "@/lib/copy";
import type { Evaluation, RoleAssessment } from "./types";

const numbers = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function EvaluationSummary({
  evaluation,
  selected,
  onSelect,
}: {
  evaluation: Evaluation;
  selected: RoleAssessment | null;
  onSelect: (id: string) => void;
}) {
  const match = selected?.match_result;
  const breakdown = match?.score_breakdown;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle><h2>{copy.aiRecommendation}</h2></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {evaluation.state === "completed" ? (
            <StatusBadge value={evaluation.recommendation} />
          ) : (
            <p role="status">{copy.processing}</p>
          )}
          <p>{evaluation.reason}</p>
        </CardContent>
      </Card>
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle><h2>{copy.roleAssessment}</h2></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="assessed-role">{copy.assessedRole}</FieldLabel>
                <NativeSelect
                  id="assessed-role"
                  value={selected.id}
                  onChange={(event) => onSelect(event.target.value)}
                >
                  {evaluation.roles.map((role) => (
                    <NativeSelectOption key={role.id} value={role.id}>
                      {role.opening_title}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            {match ? (
              <Badge variant={match.fit ? "default" : "outline"}>
                {match.fit ? copy.fit : copy.notFit}
              </Badge>
            ) : (
              <StatusBadge value={selected.recommendation} />
            )}
            <p className="text-3xl font-semibold tabular-nums" data-testid="role-match-score">
              {selected.score !== null ? numbers.format(selected.score) + "/100" : copy.noScore}
            </p>
            {selected.score_provisional && <p>{copy.provisionalScore}</p>}
            {breakdown && (
              <dl className="grid gap-3 sm:grid-cols-2" data-testid="score-breakdown">
                {[
                  [copy.skillCoverage, `${numbers.format(breakdown.coverage_percent)}%`],
                  [copy.baseScore, numbers.format(breakdown.base_score)],
                  [copy.preferredBonus, `+${numbers.format(breakdown.preferred_bonus)}`],
                  [copy.additionalBonus, `+${numbers.format(breakdown.additional_bonus)}`],
                  [copy.experienceRequired, numbers.format(breakdown.experience_required)],
                  [copy.experienceDocumented, numbers.format(breakdown.experience_documented)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p>{selected.reason}</p>
            {match && (
              <>
                <p>{match.exp_ok ? copy.experienceMet : copy.experienceMissing}</p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: copy.matched, items: match.matched },
                    { label: copy.missing, items: match.missing },
                  ].map(({ label, items }) => (
                    <div key={label}>
                      <dt className="font-medium">{label}</dt>
                      <dd>
                        {items.length ? (
                          <ul className="list-disc pl-5">
                            {items.map((item, index) => (
                              <li key={index + ":" + item}>{item}</li>
                            ))}
                          </ul>
                        ) : copy.noItems}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {breakdown && (
              <details>
                <summary className="cursor-pointer">{copy.criterionEvidence}</summary>
                <ul className="mt-3 flex flex-col gap-3">
                  {breakdown.criteria.map((criterion) => (
                    <li key={criterion.id}>
                      <p>{criterion.label} — {copy.criterionGrades[criterion.status]}</p>
                      {criterion.evidence && (
                        <blockquote className="mt-1 border-l-2 pl-3 text-sm text-muted-foreground">
                          {criterion.evidence.quote}
                        </blockquote>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
