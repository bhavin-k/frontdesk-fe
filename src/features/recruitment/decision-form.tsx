"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { recruitmentCopy as copy } from "@/lib/copy";
import { api } from "./api";
import type { Application, Evaluation, Match } from "./types";

export function DecisionForm({ base, application, match, evaluation, assessmentId, onSaved }: {
  base: string; application: Application; match: Match | null; evaluation: Evaluation | null;
  assessmentId: string | null; onSaved: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const [decision, setDecision] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<{ payload: string; key: string } | null>(null);
  async function persist() {
    const payload = JSON.stringify({
      ...(evaluation ? { evaluation_id: evaluation.id, expected_version: application.version,
        role_assessment_id: assessmentId } : { match_run_id: match?.match_run_id }),
      decision, confirm_rejection: decision === "reject" && confirmed,
    });
    if (request.current?.payload !== payload) request.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await api(`${base}/applications/${application.id}/review-decisions`, {
        method: "POST", body: payload, headers: { "Idempotency-Key": request.current.key },
      });
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  const unavailable = busy || (evaluation !== null && evaluation.state !== "completed");
  return <>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (decision === "reject") setDialog(true);
      else void persist().catch(() => {});
    }}>
      <fieldset disabled={unavailable}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="decision">{copy.decision}</FieldLabel>
            <NativeSelect id="decision" required value={decision} onChange={(event) => {
              setDecision(event.target.value); setConfirmed(false);
            }}>
              <NativeSelectOption value="" disabled>{copy.chooseDecision}</NativeSelectOption>
              <NativeSelectOption value="shortlist">{copy.selectCandidate}</NativeSelectOption>
              <NativeSelectOption value="reject">{copy.reject}</NativeSelectOption>
            </NativeSelect>
          </Field>
          {decision === "reject" && <Field orientation="horizontal">
            <Checkbox id="confirm-rejection" checked={confirmed} onCheckedChange={setConfirmed} />
            <FieldLabel htmlFor="confirm-rejection">{t("review.confirmLabel")}</FieldLabel>
          </Field>}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" loading={busy} disabled={unavailable || !decision ||
            (decision === "reject" && !confirmed) || (decision === "shortlist" && evaluation !== null && !assessmentId)}>
            {copy.saveDecision}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
    <ConfirmActionDialog open={dialog} onOpenChange={setDialog} title={t("review.rejectionTitle")}
      description={t("review.rejectionDescription")} confirmLabel={t("review.confirm")}
      cancelLabel={t("common:actions.cancel")} confirmVariant="destructive" pending={busy} onConfirm={persist} />
  </>;
}
