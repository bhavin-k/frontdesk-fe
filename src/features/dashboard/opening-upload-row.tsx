"use client";
import Link from "next/link";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Application, Upload } from "@/features/recruitment/types";
import type { IntakeRecord } from "@/features/recruitment/intake/types";
import { displayTime } from "@/features/recruitment/api";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge, useResource } from "./ui";

export function OpeningUploadRow({
  upload,
  intake,
}: {
  upload: Upload;
  intake?: IntakeRecord;
}) {
  const { t } = useTranslation("dashboard");
  const application = useResource<Application>(
    `/applications/${upload.application_id}`,
    { enabled: !!upload.application_id },
  );
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-muted p-2">
            <FileText className="size-4" />
          </span>
          <div>
            {intake?.filename && (
              <p className="font-medium">{intake.filename}</p>
            )}
            <code
              className={intake ? "text-xs text-muted-foreground" : "text-sm"}
            >
              {upload.upload_id.slice(0, 8)}
            </code>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {application.data?.profile.name ?? t("candidates.unknown")}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {intake ? t("design.emailSource") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <StatusBadge value={application.data?.status ?? upload.status} />
          {application.data && application.data.status !== upload.status && (
            <span className="text-xs text-muted-foreground">
              {t(`status.${upload.status}`, {
                defaultValue: upload.status.replaceAll("_", " "),
              })}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {intake ? displayTime(intake.received_at) : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {displayTime(upload.retention_expires_at)}
      </TableCell>
      <TableCell className="text-right">
        <Link
          className="text-sm font-medium underline"
          href={`/dashboard/review/${upload.upload_id}`}
        >
          {t("review.view")}
        </Link>
      </TableCell>
    </TableRow>
  );
}
