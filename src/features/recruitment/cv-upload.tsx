"use client";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File;
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
          <Field>
            <FieldLabel htmlFor="cv-file">{copy.cvFile}</FieldLabel>
            <Input
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
