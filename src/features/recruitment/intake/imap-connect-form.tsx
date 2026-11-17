"use client";

import { useId, useState } from "react";
import copy from "../../../../public/locales/en/intake.json";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "../api";
import type { Mailbox } from "./types";

export function ImapConnectForm({
  base,
  openingId,
  mailbox,
  onDone,
  onCancel,
}: {
  base: string;
  openingId?: string;
  mailbox?: Mailbox;
  onDone: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = form.elements.namedItem(
      "app_password",
    ) as HTMLInputElement;
    const body = JSON.stringify({
      app_password: values.get("app_password"),
      ...(mailbox
        ? { expected_generation: mailbox.generation }
        : {
            email: values.get("email"),
            opening_id: openingId,
          }),
    });
    password.value = "";
    try {
      await api<Mailbox>(
        `${base}/mailboxes/${mailbox ? `${mailbox.id}/imap-credentials` : "imap"}`,
        { method: "POST", body },
      );
      onDone();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg">
      <fieldset disabled={busy}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-email`}>{copy.imapEmail}</FieldLabel>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={320}
              defaultValue={mailbox?.email ?? ""}
              readOnly={Boolean(mailbox)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-password`}>
              {copy.imapPassword}
            </FieldLabel>
            <Input
              id={`${id}-password`}
              name="app_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={16}
              maxLength={128}
              aria-describedby={`${id}-help`}
            />
            <FieldDescription id={`${id}-help`}>
              {copy.imapHelp}
            </FieldDescription>
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              {mailbox ? copy.imapReconnect : copy.imapVerify}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {copy.cancel}
            </Button>
          </div>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
