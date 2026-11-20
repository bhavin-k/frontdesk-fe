"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, ArrowLeft, BriefcaseBusiness, Search } from "lucide-react";
import { OpeningForm } from "@/features/recruitment/opening-form";
import { CVUpload } from "@/features/recruitment/cv-upload";
import type { Opening, Page, Upload } from "@/features/recruitment/types";
import { useBusiness } from "./business-context";
import { cn } from "@/lib/utils";
import type { OverviewData } from "./overview";
import {
  PageIntro,
  ErrorNotice,
  EmptyState,
  StatusBadge,
  useResource,
} from "./ui";
import { Button } from "@/components/ui/button";
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
import { TableCardSkeleton } from "@/components/loading-skeletons";
import {
  OpeningActions,
  OpeningStatusHint,
  OpeningSetup,
} from "./opening-management";
import { SectionBlock } from "@/components/section-block";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useOpeningDirectory } from "./opening-directory";
import { OpeningUploadRow } from "./opening-upload-row";
import type { IntakeRecord } from "@/features/recruitment/intake/types";
import { OpeningMailbox } from "./opening-mailbox";
import { displayTime } from "@/features/recruitment/api";

export function OpeningsPage() {
  const { t } = useTranslation("dashboard");
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("cvs");
  const openings = useOpeningDirectory();
  const overview = useResource<OverviewData>("/overview");
  const counts = new Map(
    overview.data?.by_opening.map((row) => [row.opening_id, row.counts]) ?? [],
  );
  const filtered = (openings.data ?? [])
    .filter(
      (item) =>
        (!status || item.status === status) &&
        `${item.title} ${item.details?.location ?? ""}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (counts.get(b.id)?.cvs_received ?? 0) -
          (counts.get(a.id)?.cvs_received ?? 0),
    );
  const visible = filtered.slice(offset, offset + 20);
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("openings.title")}
        description={t("openings.description")}
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/openings/new" />}
          >
            <Plus data-icon="inline-start" />
            {t("openings.create")}
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t("openings.filterStatus")}
          className="inline-flex w-fit flex-wrap gap-1 rounded-xl bg-muted p-1"
        >
          {["", "active", "paused", "closed"].map((value) => (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setOffset(0);
              }}
              className={cn(
                "h-9 rounded-[9px] px-4 text-sm transition-colors",
                status === value
                  ? "bg-card font-semibold text-foreground shadow-sm"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {value ? t(`status.${value}`) : t("openings.allStatuses")}{" "}
              <span className="ml-1 tabular-nums">
                {openings.data?.filter(
                  (item) => !value || item.status === value,
                ).length ?? ""}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              aria-label={t("design.searchOpenings")}
              placeholder={t("design.searchOpenings")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
            />
          </div>
          <NativeSelect
            aria-label={t("design.sort")}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setOffset(0);
            }}
          >
            <NativeSelectOption value="cvs">
              {t("design.mostCVs")}
            </NativeSelectOption>
            <NativeSelectOption value="title">
              {t("design.titleSort")}
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      {openings.error && (
        <ErrorNotice
          error={openings.error}
          retry={() => {
            void openings.refetch();
          }}
        />
      )}
      {openings.isPending ? (
        <TableCardSkeleton />
      ) : visible.length ? (
        <>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("openings.titleColumn")}</TableHead>
                  <TableHead>{t("openings.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("overview.received")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("overview.shortlisted")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("overview.needsReview")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("overview.rejected")}
                  </TableHead>
                  <TableHead>{t("design.deadline")}</TableHead>
                  <TableHead>{t("openings.actions")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((opening) => (
                  <TableRow key={opening.id}>
                    <TableCell className="font-semibold">
                      <Link
                        className="hover:underline"
                        href={`/dashboard/openings/${opening.id}`}
                      >
                        {opening.title}
                      </Link>
                      <p className="mt-1 text-sm font-normal text-muted-foreground">
                        {[
                          opening.details?.department,
                          opening.details?.location,
                          opening.details?.employment_type,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={opening.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.get(opening.id)?.cvs_received ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.get(opening.id)?.shortlisted ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.get(opening.id)?.needs_review ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.get(opening.id)?.rejected ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opening.details?.application_deadline
                        ? new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                            timeZone: "Asia/Kolkata",
                          }).format(
                            new Date(opening.details.application_deadline),
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <OpeningActions opening={opening} compact />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/dashboard/openings/${opening.id}`} />
                        }
                      >
                        {t("design.open")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("design.showing", {
                from: offset + 1,
                to: offset + visible.length,
                count: filtered.length,
              })}
            </p>
            <ListPagination
              offset={offset}
              count={visible.length}
              onChange={setOffset}
              hasMore={offset + visible.length < filtered.length}
            />
          </div>
        </>
      ) : search || status ? (
        <EmptyState
          title={t("design.noResults")}
          description={t("design.changeFilters")}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("");
                setOffset(0);
              }}
            >
              {t("design.clearFilters")}
            </Button>
          }
        />
      ) : (
        <EmptyState
          title={t("openings.empty")}
          description={t("openings.emptyDescription")}
          icon={<BriefcaseBusiness />}
          action={
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/openings/new" />}
            >
              {t("openings.create")}
            </Button>
          }
        />
      )}
    </div>
  );
}

export function NewOpeningPage() {
  const { t } = useTranslation("dashboard");
  const { base } = useBusiness();
  const router = useRouter();
  const query = useQueryClient();
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={t("openings.create")}
        description={t("openings.single")}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/openings" />}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("openings.back")}
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t("openings.detail")}</CardTitle>
          <CardDescription>{t("openings.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {base && (
            <OpeningForm
              base={base}
              onCreated={(opening) => {
                void query.invalidateQueries({ queryKey: ["recruitment"] });
                router.push(`/dashboard/openings/${opening.id}`);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OpeningDetail({ id }: { id: string }) {
  const { t } = useTranslation(["dashboard", "recruitment"]);
  const { base } = useBusiness();
  const [offset, setOffset] = useState(0);
  const query = useQueryClient();
  const router = useRouter();
  const opening = useResource<Opening>(`/openings/${id}`, { poll: 30000 });
  const files = useResource<Page<Upload>>(
    `/cv-uploads?opening_id=${id}&limit=20&offset=${offset}`,
    { poll: true },
  );
  const [notice, setNotice] = useState("");
  const intake = useResource<Page<IntakeRecord>>("/mail-intake?limit=100", {
    poll: 30000,
  });
  const overview = useResource<OverviewData>(
    `/overview?opening_id=${encodeURIComponent(id)}`,
    { poll: 30000 },
  );
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title={opening.data?.title ?? t("dashboard:openings.detail")}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/dashboard/openings" />}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("dashboard:openings.back")}
          </Button>
        }
      />
      {opening.error && <ErrorNotice error={opening.error} />}
      {opening.isPending ? (
        <TableCardSkeleton />
      ) : (
        opening.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge value={opening.data.status} />
              <OpeningActions opening={opening.data} />
            </div>
            <OpeningStatusHint opening={opening.data} />
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {[
                opening.data.details?.department,
                opening.data.details?.location,
                opening.data.details?.employment_type,
                opening.data.details?.application_deadline
                  ? displayTime(opening.data.details.application_deadline)
                  : null,
              ]
                .filter(Boolean)
                .map((value, index) => (
                  <span
                    key={index}
                    className="rounded-md border bg-card px-2 py-1"
                  >
                    {value}
                  </span>
                ))}
            </div>
            {overview.data && (
              <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card md:grid-cols-4">
                {(
                  [
                    ["cvs_received", "received"],
                    ["shortlisted", "shortlisted"],
                    ["needs_review", "needsReview"],
                    ["rejected", "rejected"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="border-r border-border/60 px-5 py-4 last:border-r-0"
                  >
                    <p className="mb-2 text-xs text-muted-foreground">
                      {t(`dashboard:overview.${label}`)}
                    </p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {overview.data!.totals[key]}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <OpeningSetup
              opening={opening.data}
              sideContent={
                <>
                  {opening.data.status === "active" && (
                    <Card>
                      <CardHeader>
                        <CardTitle>{t("recruitment:upload")}</CardTitle>
                        <CardDescription>
                          {t("recruitment:uploadHint")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {base && (
                          <CVUpload
                            base={base}
                            openingId={id}
                            onUploaded={(upload, duplicate) => {
                              setNotice(
                                t(
                                  duplicate
                                    ? "recruitment:duplicate"
                                    : "recruitment:uploadSuccess",
                                ),
                              );
                              void query.invalidateQueries({
                                queryKey: ["recruitment"],
                              });
                              router.push(
                                `/dashboard/review/${upload.upload_id}`,
                              );
                            }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  )}
                  <OpeningMailbox openingId={id} />
                </>
              }
            />
            {notice && <p role="status">{notice}</p>}
            <SectionBlock title={t("dashboard:openings.uploads")}>
              <TableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("recruitment:cvFile")}</TableHead>
                      <TableHead>{t("dashboard:candidates.name")}</TableHead>
                      <TableHead>{t("dashboard:design.source")}</TableHead>
                      <TableHead>{t("dashboard:openings.status")}</TableHead>
                      <TableHead>{t("dashboard:design.received")}</TableHead>
                      <TableHead>{t("recruitment:retention")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.data?.items.map((upload) => (
                      <OpeningUploadRow
                        key={upload.upload_id}
                        upload={upload}
                        intake={intake.data?.items.find(
                          (item) => item.upload_id === upload.upload_id,
                        )}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableCard>
              <ListPagination
                offset={offset}
                count={files.data?.items.length ?? 0}
                onChange={setOffset}
              />
            </SectionBlock>
          </>
        )
      )}
    </div>
  );
}

export function ListPagination({
  offset,
  count,
  onChange,
  hasMore,
}: {
  offset: number;
  count: number;
  onChange: (offset: number) => void;
  hasMore?: boolean;
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - 20))}
      >
        {t("table.previous")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={
          (hasMore === undefined ? count < 20 : !hasMore) || offset >= 10000
        }
        onClick={() => onChange(offset + 20)}
      >
        {t("table.next")}
      </Button>
    </div>
  );
}
