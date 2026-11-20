"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { useBusiness } from "./business-context";
import { api, recruitmentQueryKey } from "@/features/recruitment/api";
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

export function useResource<T>(
  path: string,
  options: {
    poll?: boolean | number | ((data: T | undefined) => boolean | number);
    staleTime?: number;
    enabled?: boolean;
  } = {},
) {
  const { base, userId } = useBusiness();
  return useQuery({
    queryKey: recruitmentQueryKey(userId, base, path),
    ...(options.staleTime === undefined
      ? {}
      : { staleTime: options.staleTime }),
    enabled: !!base && options.enabled !== false,
    queryFn: ({ signal }) => api<T>(`${base}${path}`, {}, signal),
    refetchInterval: (query) => {
      const poll =
        typeof options.poll === "function"
          ? options.poll(query.state.data)
          : options.poll;
      return typeof poll === "number" ? poll : poll ? 5000 : false;
    },
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
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <Inbox />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
const statusTone: Record<string, "success" | "warning" | "danger"> = {
  shortlisted: "success",
  recommended_shortlist: "success",
  active: "success",
  connected: "success",
  idle: "success",
  resolved: "success",
  SHORTLISTED: "success",
  BOOKED: "success",
  rejected: "danger",
  recommended_rejection: "danger",
  failed: "danger",
  error: "danger",
  reauthorization_required: "danger",
  DECLINED: "danger",
  FAILED_DELIVERY: "danger",
  needs_review: "warning",
  paused: "warning",
  retry_wait: "warning",
  needs_configuration: "warning",
  pending_authorization: "warning",
  open: "warning",
  NO_RESPONSE: "warning",
  NEEDS_HUMAN: "warning",
  EMAIL_MISSING: "warning",
};
/** Green for good outcomes, red for rejections and failures, amber for anything waiting on a person, grey otherwise. */
export function StatusBadge({ value }: { value: string }) {
  const { t } = useTranslation("dashboard");
  const status = value || "not_assessed";
  return (
    <Badge variant={statusTone[status] ?? "neutral"}>
      {t(`status.${status}`, { defaultValue: status.replaceAll("_", " ") })}
    </Badge>
  );
}
