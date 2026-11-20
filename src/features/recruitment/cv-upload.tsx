"use client";

import { useTranslation } from "react-i18next";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { recruitmentCopy as copy } from "@/lib/copy";
import { apiWithStatus } from "./api";
import type { Upload } from "./types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CVUpload({
  base,
  openingId,
  onUploaded,
}: {
  base: string;
  openingId: string;
  onUploaded: (upload: Upload, duplicate: boolean) => void;
}) {
  const { t } = useTranslation("dashboard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File;
    if (!file || !file.size) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(copy.fileTooLarge);
      return;
    }
    key.current ??= crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      const result = await apiWithStatus<Upload>(
        `${base}/openings/${openingId}/cv-uploads`,
        {
          method: "POST",
          headers: { "Idempotency-Key": key.current },
          body: data,
        },
      );
      onUploaded(result.data, result.status === 200);
      key.current = null;
      form.reset();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <FieldGroup>
          <Field
            className="rounded-2xl border border-dashed bg-muted/20 p-5"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (busy || !input.current || !event.dataTransfer.files.length)
                return;
              const transfer = new DataTransfer();
              transfer.items.add(event.dataTransfer.files[0]);
              input.current.files = transfer.files;
              key.current = null;
              setError("");
            }}
          >
            <FieldLabel
              htmlFor="cv-file"
              className="flex cursor-pointer flex-col items-center gap-3 py-4 text-center"
            >
              <FileUp className="size-10 text-muted-foreground" />
              <span>{t("design.dropCV")}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t("design.fileHint")}
              </span>
              <span className="sr-only">{copy.cvFile}</span>
            </FieldLabel>
            <Input
              ref={input}
              id="cv-file"
              name="file"
              type="file"
              accept=".pdf,.docx,.doc,.jpeg,.jpg,.png,image/jpeg,image/png"
              required
              onChange={() => {
                key.current = null;
                setError("");
              }}
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" loading={busy}>
            {copy.uploadButton}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
