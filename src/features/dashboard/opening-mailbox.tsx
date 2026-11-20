"use client";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Page } from "@/features/recruitment/types";
import type { Mailbox } from "@/features/recruitment/intake/types";
import { displayTime } from "@/features/recruitment/api";
import { ErrorNotice, StatusBadge, useResource } from "./ui";

export function OpeningMailbox({ openingId }: { openingId: string }) {
  const { t } = useTranslation("dashboard");
  const mailboxes = useResource<Page<Mailbox>>("/mailboxes?limit=100", {
    poll: 30000,
  });
  const rows =
    mailboxes.data?.items.filter((row) => row.opening_id === openingId) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("design.emailIntake")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mailboxes.error && <ErrorNotice error={mailboxes.error} />}
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-lg bg-muted p-2">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="break-all font-medium">
                    {row.email ?? row.provider}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.provider} · {row.folder_id}
                  </p>
                </div>
              </div>
              <StatusBadge value={row.status} />
            </div>
            {row.last_success_at && (
              <p className="text-xs text-muted-foreground">
                {t("design.lastChecked")} {displayTime(row.last_success_at)}
              </p>
            )}
          </div>
        ))}
        {!rows.length && (
          <p className="text-sm text-muted-foreground">
            {t(mailboxes.isPending ? "table.loading" : "design.noMailbox")}
          </p>
        )}
        <Link
          href="/dashboard/integrations"
          className="w-fit text-sm font-medium underline"
        >
          {t("design.manageMailbox")}
        </Link>
      </CardContent>
    </Card>
  );
}
