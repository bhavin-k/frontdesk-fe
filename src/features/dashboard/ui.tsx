"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { useBusiness } from "./business-context";
import { api } from "@/features/recruitment/api";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export function useResource<T>(path: string, options: { poll?: boolean } = {}) {
  const { base, userId } = useBusiness();
  return useQuery({
    queryKey: ["recruitment", userId, base, path],
    enabled: !!base,
    queryFn: ({ signal }) => api<T>(`${base}${path}`, {}, signal),
    refetchInterval: options.poll ? 5000 : false,
  });
}
export function PageIntro({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <PageHeader title={title} actions={actions} />
      {description && <p className="type-section-description">{description}</p>}
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-col gap-3">
        {error.message}
        {retry && (
          <Button variant="outline" onClick={retry}>
            {t("loading.retry")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <Inbox />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
export function StatusBadge({ value }: { value: string }) {
  const { t } = useTranslation("dashboard");
  return (
    <Badge
      variant={
        value === "rejected"
          ? "destructive"
          : value === "shortlisted" || value === "completed"
            ? "secondary"
            : "outline"
      }
    >
      {t(`status.${value}`, { defaultValue: value.replaceAll("_", " ") })}
    </Badge>
  );
}
