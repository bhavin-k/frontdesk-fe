"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHydrated } from "@/hooks/use-hydrated";
import { api } from "./api";
import type { JobDetails, Opening } from "./types";

const numbers = [
  "total_experience_years",
  "relevant_experience_years",
  "salary_min",
  "salary_max",
  "headcount",
] as const;
const texts = ["department", "location", "employment_type"] as const;
const longTexts = ["domain_experience", "candidate_requirements"] as const;

function istInput(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(" ", "T");
}

export function OpeningForm({
  base,
  onCreated,
  initial,
}: {
  base: string;
  onCreated: (opening: Opening) => void;
  initial?: Opening;
}) {
  const { t } = useTranslation("dashboard");
  const hydrated = useHydrated();
  const [questions, setQuestions] = useState(() =>
    (initial?.questions ?? []).map((text, id) => ({ text, id })),
  );
  const nextQuestion = useRef(questions.length);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = (key: string) => t(`openings.setup.${key}`);

  function move(index: number, by: number) {
    setQuestions((current) => {
      const rows = [...current];
      [rows[index], rows[index + by]] = [rows[index + by], rows[index]];
      return rows;
    });
  }

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const details: JobDetails = {};
    for (const name of numbers)
      details[name] = data.get(name) ? Number(data.get(name)) : null;
    for (const name of [...texts, ...longTexts])
      details[name] = String(data.get(name) ?? "").trim() || null;
    details.application_deadline = data.get("application_deadline")
      ? new Date(`${data.get("application_deadline")}:00+05:30`).toISOString()
      : null;
    const payload = JSON.stringify({
      title: data.get("title"),
      job_description: data.get("description"),
      details,
      questions: questions.map((row) => row.text),
      ...(initial ? { expected_revision: initial.revision } : {}),
    });
    const files = data
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);
    if (
      files.length > 5 ||
      files.some((file) => file.size > 10 * 1024 * 1024)
    ) {
      setError(label("fileLimits"));
      return;
    }
    const fingerprint =
      payload +
      files
        .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
        .join("|");
    if (request.current?.fingerprint !== fingerprint)
      request.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const multipart = new FormData();
      multipart.set("payload", payload);
      for (const file of files) multipart.append("files", file);
      onCreated(
        await api<Opening>(
          `${base}/openings${initial ? `/${initial.id}` : ""}`,
          {
            method: initial ? "PATCH" : "POST",
            body: files.length ? multipart : payload,
            headers: { "Idempotency-Key": request.current.key },
          },
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form method="post" onSubmit={submit}>
      <fieldset disabled={busy || !hydrated}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="opening-title">{label("title")}</FieldLabel>
            <Input
              id="opening-title"
              name="title"
              required
              maxLength={200}
              defaultValue={initial?.title}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="opening-description">
              {label("description")}
            </FieldLabel>
            <Textarea
              id="opening-description"
              name="description"
              required
              minLength={10}
              maxLength={20000}
              rows={6}
              defaultValue={initial?.job_description}
            />
            <FieldDescription>{label("automaticHint")}</FieldDescription>
          </Field>
          <FieldSet>
            <FieldLegend>{label("optionalDetails")}</FieldLegend>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              {texts.map((name) => (
                <Field key={name}>
                  <FieldLabel htmlFor={`job-${name}`}>{label(name)}</FieldLabel>
                  <Input
                    id={`job-${name}`}
                    name={name}
                    maxLength={name === "employment_type" ? 100 : 200}
                    defaultValue={initial?.details?.[name] ?? ""}
                  />
                </Field>
              ))}
              {numbers.map((name) => (
                <Field key={name}>
                  <FieldLabel htmlFor={`job-${name}`}>{label(name)}</FieldLabel>
                  <Input
                    id={`job-${name}`}
                    name={name}
                    type="number"
                    min={name === "headcount" ? 1 : 0}
                    max={
                      name.includes("experience")
                        ? 80
                        : name === "headcount"
                          ? 100000
                          : undefined
                    }
                    step={name.includes("experience") ? 0.1 : 1}
                    defaultValue={initial?.details?.[name] ?? ""}
                  />
                </Field>
              ))}
              <Field>
                <FieldLabel htmlFor="job-deadline">
                  {label("application_deadline")}
                </FieldLabel>
                <Input
                  id="job-deadline"
                  name="application_deadline"
                  type="datetime-local"
                  defaultValue={istInput(
                    initial?.details?.application_deadline,
                  )}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              {longTexts.map((name) => (
                <Field key={name}>
                  <FieldLabel htmlFor={`job-${name}`}>{label(name)}</FieldLabel>
                  <Textarea
                    id={`job-${name}`}
                    name={name}
                    rows={3}
                    maxLength={name === "candidate_requirements" ? 10000 : 4000}
                    defaultValue={initial?.details?.[name] ?? ""}
                  />
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>
          {!initial && (
            <Field>
              <FieldLabel htmlFor="job-files">{label("documents")}</FieldLabel>
              <Input
                id="job-files"
                name="files"
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
              />
              <FieldDescription>{label("fileLimits")}</FieldDescription>
            </Field>
          )}
          <FieldSet>
            <FieldLegend>{label("questions")}</FieldLegend>
            <FieldDescription>{label("questionsHint")}</FieldDescription>
            <FieldGroup>
              {questions.map((row, index) => (
                <Field key={row.id}>
                  <FieldLabel htmlFor={`job-question-${row.id}`}>
                    {t("openings.setup.question", { number: index + 1 })}
                  </FieldLabel>
                  <Textarea
                    id={`job-question-${row.id}`}
                    required
                    maxLength={2000}
                    value={row.text}
                    onChange={(event) =>
                      setQuestions((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, text: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={t("openings.setup.moveUp", {
                        number: index + 1,
                      })}
                    >
                      <ArrowUp data-icon="inline-start" />
                      {label("up")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={index === questions.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={t("openings.setup.moveDown", {
                        number: index + 1,
                      })}
                    >
                      <ArrowDown data-icon="inline-start" />
                      {label("down")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setQuestions((current) =>
                          current.filter((item) => item.id !== row.id),
                        )
                      }
                      aria-label={t("openings.setup.removeQuestion", {
                        number: index + 1,
                      })}
                    >
                      <Trash2 data-icon="inline-start" />
                      {label("remove")}
                    </Button>
                  </div>
                </Field>
              ))}
            </FieldGroup>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={questions.length >= 30}
              onClick={() => {
                const id = nextQuestion.current++;
                setQuestions((current) => [...current, { id, text: "" }]);
              }}
            >
              <Plus data-icon="inline-start" />
              {label("addQuestion")}
            </Button>
          </FieldSet>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" loading={busy}>
            {initial ? label("save") : t("openings.create")}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
