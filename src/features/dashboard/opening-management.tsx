"use client";

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Pause,
  Play,
  Square,
  Pencil,
  Download,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export function OpeningActions({
  opening,
  compact = false,
}: {
  opening: Opening;
  compact?: boolean;
}) {
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
  const controls = (
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
  return compact ? (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("openings.actions")}
          />
        }
      >
        <MoreHorizontal />
      </PopoverTrigger>
      <PopoverContent className="w-auto">{controls}</PopoverContent>
    </Popover>
  ) : (
    controls
  );
}

export function OpeningStatusHint({ opening }: { opening: Opening }) {
  const { t } = useTranslation("dashboard");
  if (opening.status === "active") return null;
  return (
    <Alert>
      <AlertDescription>
        {t("openings." + opening.status + "Hint")}
      </AlertDescription>
    </Alert>
  );
}

export function OpeningSetup({
  opening,
  sideContent,
}: {
  opening: Opening;
  sideContent?: ReactNode;
}) {
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
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{t("design.aboutRole")}</CardTitle>
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
                {opening.details?.candidate_requirements && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      {t("design.requirements")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {opening.details.candidate_requirements
                        .split(/\n|;/)
                        .filter((value) => value.trim())
                        .map((value, index) => (
                          <span
                            key={index}
                            className="rounded-full border bg-muted/50 px-3 py-1 text-xs"
                          >
                            {value.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {!editing && details.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("design.jobDetails")}</CardTitle>
            </CardHeader>
            <CardContent>
              {" "}
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
            </CardContent>
          </Card>
        )}
        {!editing && (opening.questions ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap justify-between gap-2">
                <CardTitle>{t("design.questions")}</CardTitle>
                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {t("design.questionsHint")}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {" "}
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
            </CardContent>
          </Card>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {sideContent}
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
    </div>
  );
}
