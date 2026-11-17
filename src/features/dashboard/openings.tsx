"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { OpeningForm } from "@/features/recruitment/opening-form";
import { CVUpload } from "@/features/recruitment/cv-upload";
import type { Opening, Page, Upload } from "@/features/recruitment/types";
import { useBusiness } from "./business-context";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { SectionBlock } from "@/components/section-block";
import { displayTime } from "@/features/recruitment/api";

export function OpeningsPage() {
  const { t } = useTranslation("dashboard");
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const openings = useResource<Page<Opening>>(
    `/openings?limit=20&offset=${offset}${status ? `&status=${status}` : ""}`,
  );
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
      <Field className="max-w-xs">
        <FieldLabel htmlFor="opening-status-filter">
          {t("openings.filterStatus")}
        </FieldLabel>
        <NativeSelect
          id="opening-status-filter"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setOffset(0);
          }}
        >
          <NativeSelectOption value="">
            {t("openings.allStatuses")}
          </NativeSelectOption>
          {["active", "paused", "closed"].map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t(`status.${value}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
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
      ) : openings.data?.items.length ? (
        <>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("openings.titleColumn")}</TableHead>
                  <TableHead>{t("openings.status")}</TableHead>
                  <TableHead>{t("openings.actions")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {openings.data.items.map((opening) => (
                  <TableRow key={opening.id}>
                    <TableCell className="font-medium">
                      {opening.title}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={opening.status} />
                    </TableCell>
                    <TableCell>
                      <OpeningActions opening={opening} />
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
                        {t("openings.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
          <ListPagination
            offset={offset}
            count={openings.data.items.length}
            onChange={setOffset}
          />
        </>
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
  const opening = useResource<Opening>(`/openings/${id}`, { poll: true });
  const files = useResource<Page<Upload>>(
    `/cv-uploads?opening_id=${id}&limit=20&offset=${offset}`,
    { poll: true },
  );
  const [notice, setNotice] = useState("");
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
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-6">
                <OpeningSetup opening={opening.data} />
              </div>
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
                          router.push(`/dashboard/review/${upload.upload_id}`);
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            {notice && <p role="status">{notice}</p>}
            <SectionBlock title={t("dashboard:openings.uploads")}>
              <TableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("recruitment:cvFile")}</TableHead>
                      <TableHead>{t("dashboard:openings.status")}</TableHead>
                      <TableHead>{t("recruitment:retention")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.data?.items.map((upload) => (
                      <TableRow key={upload.upload_id}>
                        <TableCell>
                          <code>{upload.upload_id.slice(0, 8)}</code>
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={upload.status} />
                        </TableCell>
                        <TableCell>
                          {displayTime(upload.retention_expires_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            render={
                              <Link
                                href={`/dashboard/review/${upload.upload_id}`}
                              />
                            }
                          >
                            {t("dashboard:review.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
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
}: {
  offset: number;
  count: number;
  onChange: (offset: number) => void;
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
        disabled={count < 20 || offset >= 10000}
        onClick={() => onChange(offset + 20)}
      >
        {t("table.next")}
      </Button>
    </div>
  );
}
