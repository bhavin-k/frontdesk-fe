"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarDays, MessageCircle, Phone, Mail } from "lucide-react";
import { PageIntro, useResource, ErrorNotice } from "./ui";
import { useBusiness } from "./business-context";
import { Mailboxes } from "@/features/recruitment/intake/mailboxes";
import type {
  Mailbox,
  Capabilities,
} from "@/features/recruitment/intake/types";
import type { Opening, Page } from "@/features/recruitment/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { useQueryClient } from "@tanstack/react-query";

export function IntegrationsPage() {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const query = useQueryClient();
  const mailboxes = useResource<Page<Mailbox>>("/mailboxes?limit=100", {
    poll: true,
  });
  const capabilities = useResource<Capabilities>("/mailbox-providers");
  const openings = useResource<Page<Opening>>(
    "/openings?limit=100&status=active",
  );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("integrations.title")}
        description={t("integrations.description")}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/integrations/email-intake" />}
          >
            <Mail data-icon="inline-start" />
            {t("integrations.emailIntake")}
          </Button>
        }
      />
      {(mailboxes.error || capabilities.error) && (
        <ErrorNotice error={(mailboxes.error || capabilities.error)!} />
      )}
      {mailboxes.isPending || capabilities.isPending ? (
        <TableCardSkeleton columns={2} />
      ) : (
        base &&
        mailboxes.data &&
        capabilities.data && (
          <Mailboxes
            base={base}
            rows={mailboxes.data.items}
            capabilities={capabilities.data}
            openingOptions={openings.data?.items ?? []}
            onChanged={() => {
              void query.invalidateQueries({ queryKey: ["recruitment"] });
            }}
          />
        )
      )}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {(
          [
            ["calendar", CalendarDays, "calendarDescription"],
            ["whatsapp", MessageCircle, "whatsappDescription"],
            ["exotel", Phone, "telephonyDescription"],
            ["twilio", Phone, "telephonyDescription"],
          ] as const
        ).map(([key, Icon, description]) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Icon className="size-5 text-muted-foreground" />
                <Badge variant="outline">{t("future.coming")}</Badge>
              </div>
              <CardTitle>{t(`integrations.${key}`)}</CardTitle>
              <CardDescription>
                {t(`integrations.${description}`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("integrations.notAvailable")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
