"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { api, candidatePagePath, displayTime, isProcessing } from "@/features/recruitment/api";
import type { Page, Upload } from "@/features/recruitment/types";
import type { Candidate, CandidateSummary, Resume } from "@/features/recruitment/intake/types";
import { ApplicationReview } from "@/features/recruitment/application-review";
import { CandidateContactDetails } from "@/features/recruitment/candidate-contact-details";
import { useBusiness } from "./business-context";
import {
  PageIntro,
  EmptyState,
  ErrorNotice,
  StatusBadge,
  useResource,
} from "./ui";
import { ListPagination } from "./openings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableCard,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableCardSkeleton } from "@/components/loading-skeletons";

export function CandidatesPage() {
  const { t } = useTranslation("dashboard");
  const [offset, setOffset] = useState(0);
  const candidates = useResource<Page<CandidateSummary>>(
    candidatePagePath(offset),
    { poll: 30000, staleTime: 30000 },
  );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("candidates.title")}
        description={t("candidates.description")}
      />
      {candidates.error && (
        <ErrorNotice
          error={candidates.error}
          retry={() => {
            void candidates.refetch();
          }}
        />
      )}
      {candidates.isPending ? (
        <TableCardSkeleton />
      ) : candidates.data?.items.length ? (
        <>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("candidates.name")}</TableHead>
                  <TableHead>{t("candidates.opening")}</TableHead>
                  <TableHead>{t("candidates.score")}</TableHead>
                  <TableHead>{t("candidates.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.data.items.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/dashboard/candidates/${candidate.id}`}
                      >
                        {candidate.profile.name ?? t("candidates.unknown")}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {candidate.profile.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      {candidate.no_matching_opening
                        ? t("candidates.noMatchingOpening")
                        : (candidate.opening_title ?? "—")}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {candidate.score === null
                        ? t("candidates.noScore")
                        : `${candidate.score}%`}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={candidate.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            href={`/dashboard/candidates/${candidate.id}`}
                          />
                        }
                      >
                        {t("candidates.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <ListPagination
            offset={offset}
            count={candidates.data.items.length}
            onChange={setOffset}
          />
        </>
      ) : (
        <EmptyState
          title={t("candidates.empty")}
          description={t("candidates.emptyDescription")}
          action={
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/openings" />}
            >
              {t("openings.title")}
            </Button>
          }
        />
      )}
    </div>
  );
}

function CandidateContactCard({ candidate }: { candidate: Candidate }) {
  const { t } = useTranslation(["intake", "dashboard"]);
  const { base } = useBusiness();
  const query = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`${base}/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expected_revision: candidate.contact_revision,
          name: form.get("name") || null,
          email: form.get("email") || null,
          mobile: form.get("mobile") || null,
          reason: form.get("reason"),
        }),
      });
      setEditing(false);
      toast.success(t("dashboard:candidates.contactSaved"));
      await query.invalidateQueries({ queryKey: ["recruitment"] });
    } catch (cause) {
      setError(cause as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard:candidates.contact")}</CardTitle>
        {editing ? <CardDescription>{t("profileHelp")}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {editing ? (
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <FieldGroup>
                {(["name", "email", "mobile"] as const).map((field) => (
                  <Field key={field}>
                    <FieldLabel htmlFor={`contact-${field}`}>{t(field)}</FieldLabel>
                    <Input
                      id={`contact-${field}`}
                      name={field}
                      type={
                        field === "email"
                          ? "email"
                          : field === "mobile"
                            ? "tel"
                            : "text"
                      }
                      maxLength={
                        field === "email" ? 320 : field === "mobile" ? 40 : 200
                      }
                      defaultValue={
                        (field === "mobile"
                          ? candidate.profile.phone ?? candidate.profile.mobile
                          : candidate.profile[field]) ?? ""
                      }
                    />
                  </Field>
                ))}
                <Field>
                  <FieldLabel htmlFor="contact-reason">{t("reason")}</FieldLabel>
                  <Textarea
                    id="contact-reason"
                    name="reason"
                    required
                    minLength={5}
                    maxLength={1000}
                  />
                </Field>
                {error && <ErrorNotice error={error} />}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy} loading={busy}>
                    {t("saveContacts")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setEditing(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </FieldGroup>
            </fieldset>
          </form>
        ) : (
          <>
            <CandidateContactDetails profile={candidate.profile} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setEditing(true)}
            >
              {t("editContacts")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CurrentMatch({ uploadId }: { uploadId: string }) {
  const { base } = useBusiness();
  const query = useQueryClient();
  const [refresh, setRefresh] = useState(0);
  const upload = useResource<Upload>(`/cv-uploads/${uploadId}`, {
    poll: data => !data || isProcessing(data.status),
  });
  if (upload.error) return <ErrorNotice error={upload.error} />;
  if (!upload.data || !base) return <TableCardSkeleton />;
  return (
    <ApplicationReview
      key={upload.data.upload_id}
      base={base}
      upload={upload.data}
      refresh={refresh}
      onSaved={() => {
        setRefresh((value) => value + 1);
        void query.invalidateQueries({ queryKey: ["recruitment"] });
      }}
    />
  );
}

export function CandidateDetailPage({ id }: { id: string }) {
  const { t } = useTranslation(["dashboard", "intake"]);
  const { base } = useBusiness();
  const [offset, setOffset] = useState(0);
  const person = useResource<CandidateSummary>(`/candidates/${id}`);
  const history = useResource<Page<Resume>>(
    `/candidates/${id}/resumes?limit=20&offset=${offset}`,
  );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={person.data?.profile.name ?? t("candidates.profile")}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/candidates" />}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("candidates.back")}
          </Button>
        }
      />
      {person.error && <ErrorNotice error={person.error} />}
      {person.isPending ? (
        <TableCardSkeleton />
      ) : (
        person.data && (
          <Tabs defaultValue="match" className="flex flex-col gap-6">
            <TabsList>
              <TabsTrigger value="match">
                {t("candidates.evidence")}
              </TabsTrigger>
              <TabsTrigger value="profile">
                {t("candidates.profile")}
              </TabsTrigger>
              <TabsTrigger value="history">
                {t("candidates.resumes")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="match" className="max-w-4xl">
              {person.data.latest_upload_id ? (
                <CurrentMatch uploadId={person.data.latest_upload_id} />
              ) : (
                <EmptyState
                  title={t("candidates.noScore")}
                  description={t("review.description")}
                />
              )}
            </TabsContent>
            <TabsContent value="profile">
              <div className="grid items-start gap-6 xl:grid-cols-2">
                <CandidateContactCard
                  key={`${person.data.id}:${person.data.contact_revision}`}
                  candidate={person.data}
                />
                <div className="flex min-w-0 flex-col gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("candidates.professional")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-all text-xs leading-relaxed">
                        {JSON.stringify(person.data.profile, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                  {person.data.contact_history?.length ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("intake:contactHistory")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="flex flex-col gap-4">
                          {person.data.contact_history.map((revision) => (
                            <li key={revision.revision}>
                              <p className="text-xs text-muted-foreground">
                                {t("intake:revision")} {revision.revision} ·{" "}
                                {displayTime(revision.created_at)}
                              </p>
                              <p className="text-sm">{revision.reason}</p>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="history">
              {history.error ? (
                <ErrorNotice error={history.error} />
              ) : (
                <>
                  <TableCard>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("intake:received")}</TableHead>
                          <TableHead>{t("candidates.status")}</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.data?.items.map((resume) => (
                          <TableRow key={resume.id}>
                            <TableCell>
                              {displayTime(resume.source_received_at)}
                            </TableCell>
                            <TableCell>
                              {resume.current
                                ? t("candidates.current")
                                : resume.version}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  nativeButton={false}
                                  size="sm"
                                  variant="outline"
                                  render={
                                    <Link
                                      href={`/dashboard/review/${resume.upload_id}`}
                                    />
                                  }
                                >
                                  {t("review.view")}
                                </Button>
                                <Button
                                  nativeButton={false}
                                  size="sm"
                                  variant="ghost"
                                  render={
                                    <a
                                      href={`/api/recruitment${base}/cv-uploads/${resume.upload_id}/file`}
                                      download
                                      aria-label={t("intake:original")}
                                    />
                                  }
                                >
                                  {t("intake:original")}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCard>
                  <ListPagination
                    offset={offset}
                    count={history.data?.items.length ?? 0}
                    onChange={setOffset}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        )
      )}
    </div>
  );
}
