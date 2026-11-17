"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Square, Pencil, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { OpeningForm } from "@/features/recruitment/opening-form";
import type { Opening } from "@/features/recruitment/types";
import { api, displayTime } from "@/features/recruitment/api";
import { useBusiness } from "./business-context";

export function OpeningActions({ opening }: { opening: Opening }) {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const query = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  async function action(value: "pause" | "continue" | "close") {
    setBusy(true);
    setError("");
    try {
      await api(`${base}/openings/${opening.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: value,
          expected_revision: opening.revision,
        }),
      });
      await query.invalidateQueries({ queryKey: ["recruitment"] });
    } catch (cause) {
      setError((cause as Error).message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  if (opening.status === "closed") return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void action(
              opening.status === "paused" ? "continue" : "pause",
            ).catch(() => {})
          }
        >
          {opening.status === "paused" ? (
            <Play data-icon="inline-start" />
          ) : (
            <Pause data-icon="inline-start" />
          )}
          {t(`openings.${opening.status === "paused" ? "continue" : "pause"}`)}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming(true)}
        >
          <Square data-icon="inline-start" />
          {t("openings.close")}
        </Button>
      </div>
      {error && !confirming && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ConfirmActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        pending={busy}
        title={t("openings.closeTitle", { title: opening.title })}
        description={error || t("openings.closeDescription")}
        confirmLabel={t("openings.confirmClose")}
        cancelLabel={t("openings.cancel")}
        confirmVariant="destructive"
        onConfirm={() => action("close")}
      />
    </div>
  );
}

export function OpeningPreparation({ opening }: { opening: Opening }) {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const query = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function retry() {
    setBusy(true);
    setError("");
    try {
      await api(`${base}/openings/${opening.id}/criteria/retry`, {
        method: "POST",
        body: JSON.stringify({ expected_revision: opening.revision }),
      });
      await query.invalidateQueries({ queryKey: ["recruitment"] });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {opening.status !== "active" && (
        <Alert>
          <AlertDescription>
            {t(`openings.${opening.status}Hint`)}
          </AlertDescription>
        </Alert>
      )}
      {opening.status !== "closed" && opening.criteria_status !== "ready" && (
        <Alert
          variant={
            opening.criteria_status === "failed" ? "destructive" : "default"
          }
        >
          <AlertDescription className="flex flex-col gap-3">
            <p>
              {t(
                opening.criteria_status === "failed"
                  ? "openings.preparationFailed"
                  : "openings.preparing",
              )}
            </p>
            {opening.criteria_status === "failed" && (
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                loading={busy}
                onClick={() => void retry()}
              >
                {t("openings.retry")}
              </Button>
            )}
            {error && <p role="alert">{error}</p>}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function OpeningSetup({ opening }: { opening: Opening }) {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const query = useQueryClient();
  const [editing, setEditing] = useState<Opening | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canEdit = opening.status !== "closed";
  const refresh = () => query.invalidateQueries({ queryKey: ["recruitment"] });
  async function upload(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);
    if (!files.length) return;
    if (
      files.length + opening.documents.length > 5 ||
      files.some((file) => file.size > 10 * 1024 * 1024)
    ) {
      setError(t("openings.setup.fileLimits"));
      return;
    }
    data.set("expected_revision", String(opening.revision));
    setBusy(true);
    setError("");
    try {
      await api(`${base}/openings/${opening.id}/documents`, {
        method: "POST",
        body: data,
      });
      form.reset();
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        `${base}/openings/${opening.id}/documents/${id}?expected_revision=${opening.revision}`,
        { method: "DELETE" },
      );
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const details = Object.entries(opening.details ?? {}).filter(
    ([, value]) => value !== null && value !== "",
  );
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t("openings.detail")}</CardTitle>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(editing ? null : opening)}
              >
                <Pencil data-icon="inline-start" />
                {t(editing ? "openings.cancel" : "openings.edit")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing && base && canEdit ? (
            <OpeningForm
              key={editing.revision}
              base={base}
              initial={editing}
              onCreated={() => {
                setEditing(null);
                void refresh();
              }}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {opening.job_description}
              </p>
              {details.length > 0 && (
                <dl className="grid gap-4 sm:grid-cols-2">
                  {details.map(([name, value]) => (
                    <div key={name}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`openings.setup.${name}`)}
                      </dt>
                      <dd className="whitespace-pre-wrap text-sm">
                        {name === "application_deadline"
                          ? displayTime(String(value))
                          : typeof value === "number"
                            ? new Intl.NumberFormat("en-IN").format(value)
                            : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {(opening.questions ?? []).length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">
                    {t("openings.setup.questions")}
                  </h3>
                  <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                    {opening.questions.map((question, index) => (
                      <li key={index} className="whitespace-pre-wrap">
                        {question}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("openings.setup.documents")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(opening.documents ?? []).map((file) => (
            <div
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <a
                className="inline-flex min-w-0 items-center gap-2 break-all text-sm underline"
                href={`/api/recruitment${base}/openings/${opening.id}/documents/${file.id}/file`}
              >
                <Download className="size-4 shrink-0" />
                {file.file_name}
              </a>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void remove(file.id)}
                  aria-label={t("openings.removeDocument", {
                    name: file.file_name,
                  })}
                >
                  <Trash2 data-icon="inline-start" />
                  {t("openings.setup.remove")}
                </Button>
              )}
            </div>
          ))}
          {!opening.documents?.length && (
            <p className="text-sm text-muted-foreground">
              {t("openings.noDocuments")}
            </p>
          )}
          {canEdit && base && opening.documents.length < 5 && (
            <form method="post" onSubmit={upload}>
              <fieldset disabled={busy}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="additional-job-files">
                      {t("openings.addDocuments")}
                    </FieldLabel>
                    <Input
                      id="additional-job-files"
                      name="files"
                      type="file"
                      multiple
                      required
                      accept=".pdf,.docx,.doc"
                    />
                    <FieldDescription>
                      {t("openings.setup.fileLimits")}
                    </FieldDescription>
                  </Field>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-fit"
                    loading={busy}
                  >
                    {t("openings.uploadDocuments")}
                  </Button>
                </FieldGroup>
              </fieldset>
            </form>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
