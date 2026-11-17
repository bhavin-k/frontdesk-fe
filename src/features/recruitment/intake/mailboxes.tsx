"use client";

import { useEffect, useState } from "react";
import copy from "../../../../public/locales/en/intake.json";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/features/dashboard/ui";

import { api, displayTime } from "../api";
import type { Capabilities, Mailbox } from "./types";
import type { Opening } from "../types";
import { ImapConnectForm } from "./imap-connect-form";

function methodLabel(method: Mailbox["connection_method"]) {
  return method === "imap"
    ? copy.connectImap
    : method === "gmail_oauth"
      ? copy.connectGmail
      : copy.connectMicrosoft;
}

function navigateToAuthorization(url: string) {
  const target = new URL(url, location.origin);
  const localFake =
    target.origin === location.origin &&
    target.pathname.startsWith("/api/recruitment/oauth/");
  const provider =
    target.protocol === "https:" &&
    ["accounts.google.com", "login.microsoftonline.com"].includes(
      target.hostname,
    );
  if (!localFake && !provider) throw new Error(copy.authorizationFailed);
  location.assign(target.toString());
}

function MailboxCard({
  row,
  base,
  onChanged,
  openingOptions = [],
}: {
  openingOptions?: Pick<Opening, "id" | "title">[];
  row: Mailbox;
  base: string;
  onChanged: () => void;
}) {
  const [configuring, setConfiguring] = useState(
    row.enabled && row.status === "needs_configuration",
  );
  const [refreshImap, setRefreshImap] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!configuring || !row.enabled) return;
    const controller = new AbortController();
    api<{ items: { id: string; name: string }[] }>(
      `${base}/mailboxes/${row.id}/folders`,
      {},
      controller.signal,
    )
      .then((data) => setFolders(data.items))
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [base, row.id, row.enabled, configuring]);
  async function action(
    kind: "sync" | "disconnect" | "reauthorize",
    body?: object,
  ) {
    setBusy(true);
    setError("");
    try {
      const updated = await api<Mailbox>(
        `${base}/mailboxes/${row.id}${kind === "sync" ? "/sync" : ""}`,
        {
          method:
            kind === "sync"
              ? "POST"
              : kind === "disconnect"
                ? "DELETE"
                : "PATCH",
          ...(kind === "disconnect"
            ? {}
            : {
                body: JSON.stringify(
                  body ??
                    (kind === "sync"
                      ? {}
                      : {
                          reauthorize: true,
                          expected_generation: row.generation,
                        }),
                ),
              }),
        },
      );
      if (updated.authorization_url)
        navigateToAuthorization(updated.authorization_url);
      else onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function configure(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`${base}/mailboxes/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expected_generation: row.generation,
          folder_id: form.get("folder"),
          opening_id: form.get("opening") || row.opening_id,
          activate: true,
        }),
      });
      setConfiguring(false);
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const active = row.enabled && row.status === "connected";
  return (
    <div
      className="mt-6 flex flex-col gap-4 border-t pt-6"
      data-testid="mailbox-card"
      data-mailbox-id={row.id}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{row.email ?? row.provider}</h3>
        <StatusBadge value={row.enabled ? row.status : "disabled"} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {row.connection_method === "imap" ? copy.imapMethod : row.provider}
        </span>
        {row.enabled && <StatusBadge value={row.sync_status} />}
      </div>
      <p className="text-sm">
        {row.intake_started_at ? (
          <>
            {copy.cutoff}: <time>{displayTime(row.intake_started_at)}</time>
          </>
        ) : (
          copy.notStarted
        )}
      </p>
      {row.last_success_at && (
        <p className="text-xs text-muted-foreground">
          {copy.lastSync}: {displayTime(row.last_success_at)}
        </p>
      )}
      {row.stalled && (
        <Alert>
          <AlertDescription>{copy.stalled}</AlertDescription>
        </Alert>
      )}
      {!row.enabled && (
        <Alert>
          <AlertDescription>{copy.methodDisabled}</AlertDescription>
        </Alert>
      )}
      {row.failure_code && (
        <p className="text-sm text-destructive">
          {row.failure_code.replaceAll("_", " ")}
        </p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {row.enabled && refreshImap && (
        <ImapConnectForm
          base={base}
          mailbox={row}
          onDone={() => {
            setRefreshImap(false);
            onChanged();
          }}
          onCancel={() => setRefreshImap(false)}
        />
      )}
      {row.enabled && configuring && (
        <form onSubmit={configure}>
          <fieldset disabled={busy || folders.length === 0}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`mail-opening-${row.id}`}>
                  {copy.opening}
                </FieldLabel>
                <NativeSelect
                  id={`mail-opening-${row.id}`}
                  name="opening"
                  defaultValue={row.opening_id}
                >
                  {!openingOptions.some(
                    (opening) => opening.id === row.opening_id,
                  ) && (
                    <NativeSelectOption value={row.opening_id}>
                      {row.opening_id}
                    </NativeSelectOption>
                  )}
                  {openingOptions.map((opening) => (
                    <NativeSelectOption key={opening.id} value={opening.id}>
                      {opening.title}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`folder-${row.id}`}>
                  {copy.sourceFolder}
                </FieldLabel>
                <NativeSelect
                  id={`folder-${row.id}`}
                  name="folder"
                  defaultValue={row.folder_id}
                >
                  {!folders.some((f) => f.id === row.folder_id) && (
                    <NativeSelectOption value={row.folder_id}>
                      {row.folder_id}
                    </NativeSelectOption>
                  )}
                  {folders.map((folder) => (
                    <NativeSelectOption key={folder.id} value={folder.id}>
                      {folder.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Button className="w-fit" type="submit" loading={busy}>
                {active ? copy.saveSource : copy.startCollection}
              </Button>
            </FieldGroup>
          </fieldset>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        {active && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => action("sync")}
            >
              {copy.sync}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfiguring(!configuring)}
            >
              {copy.configure}
            </Button>
          </>
        )}
        {row.enabled &&
          [
            "reauthorization_required",
            "error",
            "pending_authorization",
          ].includes(row.status) && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                row.connection_method === "imap"
                  ? setRefreshImap(!refreshImap)
                  : action("reauthorize")
              }
            >
              {copy.reauthorize}
            </Button>
          )}
        {!["disconnecting", "disconnected"].includes(row.status) && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => action("disconnect")}
          >
            {copy.disconnect}
          </Button>
        )}
      </div>
    </div>
  );
}

export function Mailboxes({
  base,
  openingId,
  openingOptions = [],
  rows,
  capabilities,
  onChanged,
}: {
  base: string;
  openingId?: string;
  openingOptions?: Pick<Opening, "id" | "title">[];
  rows: Mailbox[];
  capabilities: Capabilities;
  onChanged: () => void;
}) {
  const [selectedOpening, setSelectedOpening] = useState("");
  const chosenOpening = openingOptions.some(
    (opening) => opening.id === selectedOpening,
  )
    ? selectedOpening
    : openingOptions.length === 1
      ? openingOptions[0].id
      : openingOptions.length === 0
        ? openingId
        : undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showImap, setShowImap] = useState(false);
  async function connect(provider: string) {
    setBusy(true);
    setError("");
    try {
      const row = await api<Mailbox>(`${base}/mailboxes`, {
        method: "POST",
        body: JSON.stringify({ provider, opening_id: chosenOpening }),
      });
      if (!row.authorization_url) throw new Error(copy.authorizationFailed);
      navigateToAuthorization(row.authorization_url);
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.mailboxes}</CardTitle>
        <CardDescription>{copy.connectionHelp}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {capabilities.provider_mode === "fake" && (
          <Alert>
            <AlertDescription>{copy.fakeNotice}</AlertDescription>
          </Alert>
        )}
        {openingOptions.length > 1 && (
          <Field>
            <FieldLabel htmlFor="connect-opening">{copy.opening}</FieldLabel>
            <NativeSelect
              id="connect-opening"
              value={selectedOpening}
              onChange={(event) => setSelectedOpening(event.target.value)}
            >
              <NativeSelectOption value="">
                {copy.chooseOpening}
              </NativeSelectOption>
              {openingOptions.map((opening) => (
                <NativeSelectOption key={opening.id} value={opening.id}>
                  {opening.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        {!chosenOpening && (
          <p className="text-sm text-muted-foreground">
            {copy.openingRequired}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {capabilities.items.map((provider) => (
            <Button
              key={provider.connection_method}
              variant="outline"
              disabled={!chosenOpening || busy || !provider.configured}
              title={!provider.configured ? copy.providerSetup : undefined}
              onClick={() =>
                provider.connection_method === "imap"
                  ? setShowImap(!showImap)
                  : connect(provider.id)
              }
            >
              {methodLabel(provider.connection_method)}
            </Button>
          ))}
        </div>
        {showImap &&
          chosenOpening &&
          capabilities.items.some(
            (provider) =>
              provider.connection_method === "imap" && provider.configured,
          ) && (
            <ImapConnectForm
              base={base}
              openingId={chosenOpening}
              onDone={() => {
                setShowImap(false);
                onChanged();
              }}
              onCancel={() => setShowImap(false)}
            />
          )}
        {capabilities.items.length === 0 && (
          <p className="text-sm text-muted-foreground">{copy.noMethods}</p>
        )}
        {capabilities.items.some((provider) => !provider.configured) && (
          <p className="text-sm text-muted-foreground">{copy.providerSetup}</p>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {rows.map((row) => (
          <MailboxCard
            key={row.id}
            row={row}
            openingOptions={openingOptions}
            base={base}
            onChanged={onChanged}
          />
        ))}
      </CardContent>
    </Card>
  );
}
