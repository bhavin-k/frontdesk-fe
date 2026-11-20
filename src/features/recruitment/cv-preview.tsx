"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Application, RoleAssessment } from "./types";
import { CandidateContactDetails } from "./candidate-contact-details";

export function CVPreview({
  base,
  uploadId,
  application,
  assessment,
}: {
  base: string;
  uploadId: string;
  application: Application;
  assessment: RoleAssessment | null;
}) {
  const { t } = useTranslation("dashboard");
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const quotes =
    assessment?.match_result?.score_breakdown?.criteria.filter(
      (item) => item.evidence,
    ) ?? [];
  const source = `/api/recruitment${base}/cv-uploads/${uploadId}/file`;
  useEffect(() => {
    if (!showOriginal) return;
    setPreview(null);
    setFailed(false);
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetch(source, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Preview unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        if (
          blob.type !== "application/pdf" &&
          !["image/png", "image/jpeg"].includes(blob.type)
        )
          throw new Error("Unsupported preview");
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl, type: blob.type });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, showOriginal]);
  return (
    <Card className="min-w-0 gap-0 pt-0">
      <CardHeader className="border-b bg-muted/30 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            {t("design.cvPreview")}
          </CardTitle>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-3 rounded-sm bg-success-soft" />
            {t("design.evidence")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div>
          <h2 className="mb-2 text-2xl font-semibold">
            {application.profile.name ?? t("candidates.unknown")}
          </h2>
          <CandidateContactDetails profile={application.profile} />
        </div>
        {application.profile.summary && (
          <p className="text-sm leading-7">{application.profile.summary}</p>
        )}
        {!!application.profile.work_history?.length && (
          <section>
            <h3 className="mb-3 border-b pb-2 text-sm font-semibold">
              {t("design.experience")}
            </h3>
            <div className="flex flex-col gap-5">
              {application.profile.work_history.map((work, index) => (
                <div key={index}>
                  <h4 className="text-sm font-semibold">
                    {work.title}, {work.company}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("design.years", { count: work.years })}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                    {work.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        {(
          [
            "skills",
            "technologies",
            "education",
            "certifications",
            "languages",
          ] as const
        ).map((field) =>
          application.profile[field]?.length ? (
            <section key={field}>
              <h3 className="mb-3 border-b pb-2 text-sm font-semibold">
                {t(`design.${field}`)}
              </h3>
              <p className="text-sm leading-7">
                {application.profile[field]!.join(", ")}
              </p>
            </section>
          ) : null,
        )}
        {!!quotes.length && (
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">{t("design.evidence")}</h3>
            {quotes.map((item) => (
              <blockquote key={item.id} className="text-sm leading-7">
                <mark className="rounded bg-success-soft px-1 text-foreground">
                  {item.evidence!.quote}
                </mark>
              </blockquote>
            ))}
          </section>
        )}
        <button
          type="button"
          className="w-fit text-sm font-medium underline"
          aria-expanded={showOriginal}
          onClick={() => setShowOriginal((value) => !value)}
        >
          {t("design.originalPreview")}
        </button>
        {showOriginal && preview?.type === "application/pdf" && (
          <iframe
            src={`${preview.url}#toolbar=0&navpanes=0`}
            title={t("design.cvPreview")}
            className="h-[680px] w-full rounded-lg border"
          />
        )}
        {showOriginal && preview?.type.startsWith("image/") && (
          /* Uploaded images use a local blob URL, not a Next image optimizer. */ <picture>
            <img
              src={preview.url}
              alt={t("design.cvPreview")}
              className="h-auto w-full rounded-lg border"
            />
          </picture>
        )}
        {showOriginal && failed && (
          <p className="text-sm leading-6 text-muted-foreground">
            {t("design.previewUnavailable")}
          </p>
        )}
        {showOriginal && !preview && !failed && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("table.loading")}
          </p>
        )}
        <a
          href={source}
          download
          className="w-fit text-sm font-medium underline"
        >
          {t("intake:original")}
        </a>
      </CardContent>
    </Card>
  );
}
