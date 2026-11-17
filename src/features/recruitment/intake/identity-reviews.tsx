"use client";

import { useEffect, useRef, useState } from "react";
import copy from "../../../../public/locales/en/intake.json";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IdentityCase } from "./types";

function Resolution({
  base,
  identifier,
  onChanged,
  onOpenUpload,
}: {
  base: string;
  identifier: string;
  onChanged: () => void;
  onOpenUpload: (id: string) => void;
}) {
  const [row, setRow] = useState<IdentityCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api<IdentityCase>(
      `${base}/identity-reviews/${identifier}`,
      {},
      controller.signal,
    )
      .then(setRow)
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [base, identifier]);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    key.current ??= crypto.randomUUID();
    try {
      await api(`${base}/identity-reviews/${identifier}/resolve`, {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
        body: JSON.stringify({
          decision: form.get("decision"),
          candidate_id: form.get("candidate") || undefined,
          expected_revision: row.candidates?.find(
            (person) => person.id === row.candidate_id,
          )?.contact_revision,
          reason: form.get("reason"),
        }),
      });
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error && !row)
    return (
      <p role="alert" className="form-error">
        {error}
      </p>
    );
  if (!row) return <p role="status">{copy.loading}</p>;
  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{copy.identityHelp}</p>
      {row.upload_id && (
        <Button
          className="w-fit"
          variant="outline"
          onClick={() => onOpenUpload(row.upload_id!)}
        >
          {copy.review}
        </Button>
      )}
      <h4 className="text-sm font-medium">
        {row.kind === "cross_role_submission"
          ? copy.crossRoleDetails
          : copy.proposedContacts}
      </h4>
      {row.kind === "cross_role_submission" ? (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            {copy.existingOpening}:{" "}
            {row.proposed_contacts.existing_opening_title ??
              row.proposed_contacts.existing_opening_id}
          </p>
          <p>
            {copy.submittedOpening}:{" "}
            {row.proposed_contacts.opening_title ??
              row.proposed_contacts.opening_id}
          </p>
        </div>
      ) : (
        <pre className="overflow-auto whitespace-pre-wrap break-all text-xs">
          {JSON.stringify(row.proposed_contacts, null, 2)}
        </pre>
      )}
      <form
        onSubmit={submit}
        onChange={() => {
          key.current = null;
        }}
      >
        <fieldset disabled={busy}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="resolution-decision">
                {copy.resolution}
              </FieldLabel>
              <NativeSelect id="resolution-decision" name="decision">
                {row.kind === "identity_conflict" ? (
                  <>
                    <NativeSelectOption value="link">
                      {copy.link}
                    </NativeSelectOption>
                    <NativeSelectOption value="create">
                      {copy.create}
                    </NativeSelectOption>
                  </>
                ) : (
                  <>
                    {row.kind === "contact_proposal" && (
                      <NativeSelectOption value="accept">
                        {copy.accept}
                      </NativeSelectOption>
                    )}
                    <NativeSelectOption value="dismiss">
                      {row.kind === "cross_role_submission"
                        ? copy.keepExistingRole
                        : copy.dismiss}
                    </NativeSelectOption>
                  </>
                )}
              </NativeSelect>
            </Field>
            {row.kind === "identity_conflict" && (
              <Field>
                <FieldLabel htmlFor="resolution-candidate">
                  {copy.chooseCandidate}
                </FieldLabel>
                <NativeSelect id="resolution-candidate" name="candidate">
                  {row.candidates?.map((person) => (
                    <NativeSelectOption key={person.id} value={person.id}>
                      {person.profile.name ?? person.id} ·{" "}
                      {person.profile.email}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="resolution-reason">{copy.reason}</FieldLabel>
              <Textarea
                id="resolution-reason"
                name="reason"
                required
                minLength={5}
                maxLength={1000}
              />
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" loading={busy}>
              {copy.resolve}
            </Button>
          </FieldGroup>
        </fieldset>
      </form>
    </div>
  );
}

export function IdentityReviews({
  base,
  rows,
  onChanged,
  onOpenUpload,
}: {
  base: string;
  rows: IdentityCase[];
  onChanged: () => void;
  onOpenUpload: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const open = rows.filter((row) => row.status === "open");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.identityReviews}</CardTitle>
      </CardHeader>
      <CardContent>
        {open.length === 0 && (
          <p className="text-sm text-muted-foreground">{copy.emptyReviews}</p>
        )}
        <ul className="flex flex-col gap-4">
          {open.map((row) => (
            <li key={row.id}>
              <Button
                variant="outline"
                onClick={() => setSelected(selected === row.id ? null : row.id)}
              >
                {copy[row.kind]} · {row.id.slice(0, 8)}
              </Button>
              {selected === row.id && (
                <Resolution
                  base={base}
                  identifier={row.id}
                  onChanged={onChanged}
                  onOpenUpload={onOpenUpload}
                />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
