"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/features/recruitment/api";
import type { Member, Retention } from "@/features/recruitment/types";
import { useBusiness } from "./business-context";
import { useResource, ErrorNotice } from "./ui";
import { SectionBlock } from "@/components/section-block";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableCard,
} from "@/components/ui/table";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { useTheme } from "@/components/theme-provider";
import { useAppearancePreference } from "@/components/appearance-provider";

export function BusinessSettingsPage() {
  const { t } = useTranslation("dashboard");
  const { business, userId } = useBusiness();
  return (
    <SectionBlock
      title={t("settings.business")}
      description={t("settings.businessDescription")}
    >
      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-[12rem_1fr]">
            <dt className="text-muted-foreground">
              {t("settings.businessName")}
            </dt>
            <dd>{business?.name}</dd>
            <dt className="text-muted-foreground">
              {t("settings.businessId")}
            </dt>
            <dd className="break-all font-mono text-xs">
              {business?.tenant_id}
            </dd>
            <dt className="text-muted-foreground">{t("settings.timezone")}</dt>
            <dd>India Standard Time · Asia/Kolkata</dd>
            <dt className="text-muted-foreground">{t("settings.role")}</dt>
            <dd>{t("workspace.role")}</dd>
            <dt className="text-muted-foreground">{t("settings.yourId")}</dt>
            <dd className="break-all font-mono text-xs">{userId}</dd>
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("settings.noEdit")}
          </p>
        </CardContent>
      </Card>
    </SectionBlock>
  );
}

export function TeamSettingsPage() {
  const { t } = useTranslation("dashboard");
  const { base, userId } = useBusiness();
  const query = useQueryClient();
  const retention = useResource<Retention>("/retention-settings");
  const members = useResource<Member[]>("/members");
  const [remove, setRemove] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  async function add(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await api(`${base}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: data.get("member") }),
      });
      form.reset();
      // An invalidated query can reuse a list fetch that started before the save.
      await query.cancelQueries({
        queryKey: ["recruitment", userId, base, "/members"],
        exact: true,
      });
      await query.invalidateQueries({ queryKey: ["recruitment"] });
      toast.success(t("settings.saved"));
    } catch (cause) {
      setError(cause as Error);
    } finally {
      setBusy(false);
    }
  }
  async function confirmRemove() {
    setBusy(true);
    setError(null);
    try {
      await api(`${base}/members/${remove}`, { method: "DELETE" });
      await query.invalidateQueries({ queryKey: ["recruitment"] });
      toast.success(t("settings.saved"));
    } catch (cause) {
      setError(cause as Error);
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[20px] border bg-card p-6">
        <h2 className="text-xl font-semibold">{t("settings.team")}</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          {t("settings.teamDescription")}
        </p>
        {(error || members.error) && (
          <ErrorNotice error={(error || members.error)!} />
        )}
        <Card className="mb-5 border-0 bg-muted/40">
          <CardHeader>
            <CardTitle>{t("settings.add")}</CardTitle>
            <CardDescription>{t("settings.registeredHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={add}>
              <FieldGroup className="gap-3 sm:flex-row sm:items-end">
                <Field className="flex-1">
                  <FieldLabel htmlFor="member-id">
                    {t("settings.memberId")}
                  </FieldLabel>
                  <Input
                    id="member-id"
                    name="member"
                    required
                    pattern="[0-9a-fA-F-]{36}"
                    disabled={busy}
                  />
                  <FieldDescription>
                    {t("settings.yourId")}:{" "}
                    <code className="break-all">{userId}</code>
                  </FieldDescription>
                </Field>
                <Button className="w-fit" type="submit" loading={busy}>
                  <Plus data-icon="inline-start" />
                  {t("settings.add")}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        {members.isPending ? (
          <TableCardSkeleton columns={3} />
        ) : (
          <TableCard className="border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.memberId")}</TableHead>
                  <TableHead>{t("settings.role")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data?.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-mono text-xs">
                      {member.user_id}
                      {member.user_id === userId && (
                        <span className="ml-2 font-sans text-muted-foreground">
                          {t("settings.you")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{t("workspace.role")}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || members.data.length <= 1}
                        onClick={() => setRemove(member.user_id)}
                      >
                        {t("settings.remove")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </section>
      {retention.error && <ErrorNotice error={retention.error} />}
      {retention.data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t("design.retentionGlance")}</CardTitle>
              <Link
                href="/dashboard/settings/retention"
                className="text-sm font-medium underline"
              >
                {t("design.editPeriods")}
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="p-3">
              <p className="mb-2 text-sm font-medium">
                {t("settings.rejectedDays")}
              </p>
              <p className="text-2xl font-semibold">
                {t("design.days", {
                  count: retention.data.rejected_retention_days,
                })}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="mb-2 text-sm font-medium">
                {t("settings.otherDays")}
              </p>
              <p className="text-2xl font-semibold">
                {t("design.days", {
                  count: retention.data.other_candidate_retention_days,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <ConfirmActionDialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title={t("settings.removeTitle")}
        description={t("settings.removeDescription")}
        confirmLabel={t("settings.remove")}
        cancelLabel={t("common:actions.cancel")}
        confirmVariant="destructive"
        pending={busy}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

function RetentionForm({ value }: { value: Retention }) {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const query = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`${base}/retention-settings`, {
        method: "PATCH",
        body: JSON.stringify({
          rejected_retention_days: Number(form.get("rejected")),
          other_candidate_retention_days: Number(form.get("other")),
        }),
      });
      await query.invalidateQueries({ queryKey: ["recruitment"] });
      toast.success(t("settings.saved"));
    } catch (cause) {
      setError(cause as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="rejected-days">
              {t("settings.rejectedDays")}
            </FieldLabel>
            <Input
              id="rejected-days"
              name="rejected"
              type="number"
              min={1}
              max={3650}
              required
              defaultValue={value.rejected_retention_days}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="other-days">
              {t("settings.otherDays")}
            </FieldLabel>
            <Input
              id="other-days"
              name="other"
              type="number"
              min={1}
              max={3650}
              required
              defaultValue={value.other_candidate_retention_days}
            />
          </Field>
          {error && <ErrorNotice error={error} />}
          <Button type="submit" loading={busy}>
            {t("settings.save")}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}

export function RetentionSettingsPage() {
  const { t } = useTranslation("dashboard");
  const retention = useResource<Retention>("/retention-settings");
  return (
    <SectionBlock
      title={t("settings.retention")}
      description={t("settings.retentionDescription")}
    >
      {retention.error && <ErrorNotice error={retention.error} />}
      {retention.isPending ? (
        <TableCardSkeleton columns={2} />
      ) : (
        retention.data && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>{t("settings.retention")}</CardTitle>
              <CardDescription>{t("settings.retentionHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <RetentionForm
                key={`${retention.data.rejected_retention_days}:${retention.data.other_candidate_retention_days}`}
                value={retention.data}
              />
            </CardContent>
          </Card>
        )
      )}
    </SectionBlock>
  );
}

export function AppearanceSettingsPage() {
  const { t } = useTranslation("dashboard");
  const { theme, setTheme } = useTheme();
  const appearance = useAppearancePreference();
  return (
    <SectionBlock title={t("settings.appearance")}>
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="appearance-theme">
                {t("account.appearance")}
              </FieldLabel>
              <NativeSelect
                id="appearance-theme"
                value={theme ?? "system"}
                onChange={(event) => setTheme(event.target.value)}
              >
                {["light", "dark", "system"].map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {t(`account.${value}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="time-format">
                {t("settings.timeFormat")}
              </FieldLabel>
              <NativeSelect
                id="time-format"
                disabled={!appearance.ready}
                value={appearance.timeFormatPreference}
                onChange={(event) =>
                  appearance.setTimeFormatPreference(
                    event.target.value as "24h" | "ampm",
                  )
                }
              >
                <NativeSelectOption value="ampm">
                  {t("settings.format12")}
                </NativeSelectOption>
                <NativeSelectOption value="24h">
                  {t("settings.format24")}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </SectionBlock>
  );
}
