"use client";

import { useEffect, useId, useState } from "react";
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
import { api, ApiError } from "../api";
import type { Mailbox } from "./types";

function isVerified(row: Mailbox) {
  return (
    row.enabled &&
    row.connection_method === "imap" &&
    ["connected", "needs_configuration"].includes(row.status)
  );
}

export function ImapConnectForm({
  base,
  openingId,
  mailbox,
  rows,
  onChanged,
  onDone,
  onCancel,
}: {
  base: string;
  openingId?: string;
  mailbox?: Mailbox;
  rows?: Mailbox[];
  onChanged: () => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState<{
    email: string;
    generation: number | undefined;
  } | null>(null);
  const saved =
    unconfirmed &&
    (mailbox
      ? isVerified(mailbox) && mailbox.generation > (unconfirmed.generation ?? 0)
      : rows?.some(
          (row) => isVerified(row) && row.email?.toLowerCase() === unconfirmed.email,
        ));
  useEffect(() => {
    if (saved) onDone();
  }, [saved, onDone]);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUnconfirmed(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    const address = String(values.get("email") ?? "").trim().toLowerCase();
    const password = form.elements.namedItem(
      "app_password",
    ) as HTMLInputElement;
    password.value = "";
    if (
      !mailbox &&
      rows?.some((row) => isVerified(row) && row.email?.toLowerCase() === address)
    ) {
      onDone();
      return;
    }
    const body = JSON.stringify({
      app_password: values.get("app_password"),
      ...(mailbox
        ? { expected_generation: mailbox.generation }
        : {
            email: values.get("email"),
            opening_id: openingId,
          }),
    });
    setBusy(true);
    try {
      await api<Mailbox>(
        `${base}/mailboxes/${mailbox ? `${mailbox.id}/imap-credentials` : "imap"}`,
        { method: "POST", body },
      );
      onDone();
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        ["API_UNAVAILABLE", "CONNECTION_LOST", "INVALID_RESPONSE"].includes(cause.code)
      ) {
        setUnconfirmed({ email: address, generation: mailbox?.generation });
        setError(copy.imapVerifyUnconfirmed);
        onChanged();
      } else {
        setError((cause as Error).message);
      }
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
