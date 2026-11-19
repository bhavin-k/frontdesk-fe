"use client";
import { useTranslation } from "react-i18next";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { PageIntro, EmptyState } from "./ui";
import { Badge } from "@/components/ui/badge";

export function FuturePage({
  kind,
}: {
  kind: "interviews" | "interviewer";
}) {
  const { t } = useTranslation("dashboard");
  const Icon = kind === "interviews" ? CalendarDays : SlidersHorizontal;
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t(`nav.${kind}`)}
        actions={<Badge variant="outline">{t("future.coming")}</Badge>}
      />
      <EmptyState
        icon={<Icon />}
        title={t(`future.${kind}`)}
        description={t(`future.${kind}Description`)}
      />
      <p className="text-sm text-muted-foreground">
        {t(
          kind === "interviews" ? "future.noInterviews" : "future.noInterviewer",
        )}
      </p>
    </div>
  );
}
