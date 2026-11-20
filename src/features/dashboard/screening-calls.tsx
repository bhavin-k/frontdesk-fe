"use client";

import { ScreeningIntroduction } from "./screening-introduction";
import { useState, type SubmitEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { api, displayTime } from "@/features/recruitment/api";
import { useBusiness } from "./business-context";
import {
  EmptyState,
  ErrorNotice,
  PageIntro,
  StatusBadge,
  useResource,
} from "./ui";

type ScreeningAction =
  | "take_over"
  | "reply"
  | "cancel"
  | "reschedule"
  | "resend"
  | "close";
type Screening = {
  id: string;
  candidate_name: string;
  role_title: string;
  status: string;
  reason: string;
  expires_at: string | null;
  booking: { starts_at: string; ends_at: string } | null;
};
type ScreeningQueue = {
  items: Screening[];
  has_more: boolean;
  enabled: boolean;
};
type ScreeningThread = Screening & {
  subject: string;
  sender_email: string | null;
  candidate_email: string;
  callback_number: string;
  version: number;
  takeover: boolean;
  actions: ScreeningAction[];
  messages: {
    id: string;
    direction: "in" | "out";
    state: string;
    body: string;
    created_at: string;
  }[];
};
type InvitationCopy = { invitation_note: string; signature: string };

const pageSize = 20;
const attention = new Set([
  "EMAIL_MISSING",
  "NEEDS_HUMAN",
  "FAILED_DELIVERY",
  "NO_RESPONSE",
]);

function ScreeningStatus({ item }: { item: Screening }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex flex-col items-start gap-1.5">
      <StatusBadge value={item.status} />
      {attention.has(item.status) && (
        <span className="text-sm text-muted-foreground">
          {t(`screening.reasons.${item.reason}`, {
            defaultValue: t("screening.followUp"),
          })}
        </span>
      )}
    </div>
  );
}

function InvitationSettings() {
  const { t } = useTranslation("dashboard");
  const { base, userId } = useBusiness();
  const cache = useQueryClient();
  const copy = useResource<InvitationCopy>("/screening-settings");
  const save = useMutation({
    mutationFn: (values: InvitationCopy) =>
      api<InvitationCopy>(`${base}/screening-settings`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: (saved) =>
      cache.setQueryData(
        ["recruitment", userId, base, "/screening-settings"],
        saved,
      ),
  });

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save.mutate({
      invitation_note: String(data.get("invitation_note") ?? ""),
      signature: String(data.get("signature") ?? ""),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("screening.invitationCopy")}</CardTitle>
        <CardDescription>{t("screening.invitationHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {copy.error && (
          <ErrorNotice error={copy.error} retry={() => void copy.refetch()} />
        )}
        {save.error && <ErrorNotice error={save.error} />}
        {save.isSuccess && (
          <Alert>
            <AlertDescription>{t("screening.copySaved")}</AlertDescription>
          </Alert>
        )}
        {copy.isPending && <TableCardSkeleton />}
        {copy.data && (
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="screening-note">
                  {t("screening.invitationNote")}
                </FieldLabel>
                <Textarea
                  id="screening-note"
                  name="invitation_note"
                  maxLength={1000}
                  defaultValue={copy.data.invitation_note}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="screening-signature">
                  {t("screening.signature")}
                </FieldLabel>
                <Input
                  id="screening-signature"
                  name="signature"
                  maxLength={300}
                  defaultValue={copy.data.signature}
                />
              </Field>
              <Button
                type="submit"
                className="self-start"
                disabled={save.isPending}
              >
                {t("screening.saveCopy")}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Conversation({ thread }: { thread: ScreeningThread }) {
  const { t } = useTranslation("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("screening.thread")}</CardTitle>
        <CardDescription>{thread.subject}</CardDescription>
      </CardHeader>
      <CardContent>
        {thread.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("screening.noMessages")}
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {thread.messages.map((message) => (
              <li key={message.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {t(
                      message.direction === "in"
                        ? "screening.fromCandidate"
                        : "screening.fromHiring",
                    )}
                    {message.direction === "out" &&
                      message.state !== "sent" && (
                        <span className="ml-2 text-muted-foreground">
                          {t(`screening.delivery.${message.state}`, {
                            defaultValue: message.state,
                          })}
                        </span>
                      )}
                  </span>
                  <time
                    dateTime={message.created_at}
                    className="text-muted-foreground"
                  >
                    {displayTime(message.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ScreeningDetail({ id, back }: { id: string; back: () => void }) {
  const { t } = useTranslation("dashboard");
  const { base, userId } = useBusiness();
  const cache = useQueryClient();
  const [reply, setReply] = useState("");
  const detail = useResource<ScreeningThread>(`/screening-requests/${id}`, {
    poll: true,
  });
  const command = useMutation({
    mutationFn: (values: {
      action: ScreeningAction;
      expected_version: number;
      body?: string;
    }) =>
      api(`${base}/screening-requests/${id}/actions`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(values),
      }),
    onSuccess: (_, values) => {
      if (values.action === "reply") setReply("");
      return cache.invalidateQueries({
        queryKey: ["recruitment", userId, base],
      });
    },
  });
  const thread = detail.data;
  const start = (action: ScreeningAction) => {
    if (thread)
      command.mutate({
        action,
        expected_version: thread.version,
        ...(action === "reply" ? { body: reply.trim() } : {}),
      });
  };
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={thread?.candidate_name || t("screening.details")}
        description={thread?.role_title}
        actions={
          <Button variant="outline" onClick={back}>
            <ArrowLeft data-icon="inline-start" />
            {t("screening.back")}
          </Button>
        }
      />
      {detail.isPending && <TableCardSkeleton />}
      {detail.error && (
        <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
      )}
      {thread && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("screening.details")}</CardTitle>
              <ScreeningStatus item={thread} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    {t("screening.email")}
                  </dt>
                  <dd className="break-words">
                    {thread.candidate_email || t("screening.contactMissing")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("screening.phone")}
                  </dt>
                  <dd>
                    {thread.callback_number || t("screening.contactMissing")}
                  </dd>
                </div>
                {thread.sender_email && (
                  <div>
                    <dt className="text-muted-foreground">
                      {t("screening.senderEmail")}
                    </dt>
                    <dd className="break-words">{thread.sender_email}</dd>
                  </div>
                )}
                {thread.booking && (
                  <div>
                    <dt className="text-muted-foreground">
                      {t("screening.booking")}
                    </dt>
                    <dd>{displayTime(thread.booking.starts_at)} IST</dd>
                  </div>
                )}
                {thread.expires_at && (
                  <div>
                    <dt className="text-muted-foreground">
                      {t("screening.deadline")}
                    </dt>
                    <dd>{displayTime(thread.expires_at)} IST</dd>
                  </div>
                )}
              </dl>
              {thread.takeover && (
                <Alert>
                  <AlertDescription>
                    {t("screening.takenOver")}
                  </AlertDescription>
                </Alert>
              )}
              {command.error && (
                <ErrorNotice
                  error={command.error}
                  retry={() => void detail.refetch()}
                />
              )}
              {thread.actions.some((action) => action !== "reply") && (
                <div className="flex flex-wrap gap-2">
                  {thread.actions
                    .filter((action) => action !== "reply")
                    .map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        disabled={command.isPending}
                        onClick={() => start(action)}
                      >
                        {t(`screening.actions.${action}`)}
                      </Button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Conversation thread={thread} />
          {thread.actions.includes("reply") && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                start("reply");
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="screening-reply">
                    {t("screening.reply")}
                  </FieldLabel>
                  <Textarea
                    id="screening-reply"
                    required
                    maxLength={4000}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                </Field>
                <Button
                  type="submit"
                  className="self-start"
                  disabled={command.isPending || !reply.trim()}
                >
                  {t("screening.actions.reply")}
                </Button>
              </FieldGroup>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function ScreeningWorkspace() {
  const { t } = useTranslation("dashboard");
  const [selected, setSelected] = useState<string>();
  const [offset, setOffset] = useState(0);
  const [showCopy, setShowCopy] = useState(false);
  const queue = useResource<ScreeningQueue>(
    `/screening-requests?limit=${pageSize}&offset=${offset}`,
    { poll: !selected },
  );
  if (queue.data && !queue.data.enabled && !queue.data.items.length)
    return (
      <>
        <ScreeningIntroduction />
        <p className="mt-6 text-sm text-muted-foreground">
          {t("screening.disabledDescription")}
        </p>
      </>
    );
  if (selected)
    return (
      <ScreeningDetail id={selected} back={() => setSelected(undefined)} />
    );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("screening.title")}
        description={t("screening.description")}
        actions={
          queue.data?.enabled && (
            <Button
              variant="outline"
              aria-expanded={showCopy}
              onClick={() => setShowCopy(!showCopy)}
            >
              {t("screening.invitationCopy")}
            </Button>
          )
        }
      />
      {showCopy && queue.data?.enabled && <InvitationSettings />}
      {queue.error && (
        <ErrorNotice error={queue.error} retry={() => void queue.refetch()} />
      )}
      {queue.isPending ? (
        <TableCardSkeleton />
      ) : queue.data?.items.length ? (
        <>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("screening.candidate")}</TableHead>
                  <TableHead>{t("screening.opening")}</TableHead>
                  <TableHead>{t("screening.status")}</TableHead>
                  <TableHead>{t("screening.booking")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("screening.details")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.candidate_name || t("screening.candidate")}
                    </TableCell>
                    <TableCell>{item.role_title}</TableCell>
                    <TableCell>
                      <ScreeningStatus item={item} />
                    </TableCell>
                    <TableCell>
                      {item.booking
                        ? `${displayTime(item.booking.starts_at)} IST`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(item.id)}
                      >
                        {t("screening.openThread")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </>
      ) : (
        queue.data && (
          <EmptyState
            icon={<Phone />}
            title={t(
              queue.data.enabled
                ? "screening.emptyTitle"
                : "screening.disabledTitle",
            )}
            description={t(
              queue.data.enabled
                ? "screening.emptyDescription"
                : "screening.disabledDescription",
            )}
          />
        )
      )}
      {(offset > 0 || queue.data?.has_more) && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(offset - pageSize)}
          >
            {t("screening.previous")}
          </Button>
          <Button
            variant="outline"
            disabled={!queue.data?.has_more}
            onClick={() => setOffset(offset + pageSize)}
          >
            {t("screening.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ScreeningCallsPage() {
  const { base } = useBusiness();
  return <ScreeningWorkspace key={base} />;
}
