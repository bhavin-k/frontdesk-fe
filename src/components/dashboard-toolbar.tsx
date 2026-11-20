"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, ChevronRight, Search } from "lucide-react";
import { useOpeningDirectory } from "@/features/dashboard/opening-directory";
import { useResource } from "@/features/dashboard/ui";
import { useReviewSummary } from "@/features/dashboard/review-summary";
import type {
  Opening,
  Page,
  Upload,
  Application,
} from "@/features/recruitment/types";
import type { CandidateSummary } from "@/features/recruitment/intake/types";
import { candidatePagePath } from "@/features/recruitment/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function ReviewCount({ badge = false }: { badge?: boolean }) {
  const { t } = useTranslation("dashboard");
  const summary = useReviewSummary();
  const count = summary.data?.total;
  if (badge)
    return count ? (
      <span className="ml-auto rounded-full bg-warning-soft px-1.5 py-0.5 text-xs font-semibold text-warning group-data-[collapsible=icon]:hidden">
        {count}
      </span>
    ) : null;
  return (
    <>
      {count === undefined ? t("nav.review") : t("design.toReview", { count })}
    </>
  );
}

export function DashboardToolbar({
  current,
  group,
}: {
  current: string;
  group: string;
}) {
  const { t } = useTranslation("dashboard");
  const pathname = usePathname();
  const openingId = /^\/dashboard\/openings\/([^/]+)$/.exec(pathname)?.[1];
  const reviewId = /^\/dashboard\/review\/([^/]+)$/.exec(pathname)?.[1];
  const detail = useResource<Opening>(`/openings/${openingId}`, {
    enabled: !!openingId && openingId !== "new",
  });
  const upload = useResource<Upload>(`/cv-uploads/${reviewId}`, {
    enabled: !!reviewId,
  });
  const application = useResource<Application>(
    `/applications/${upload.data?.application_id}`,
    { enabled: !!reviewId && !!upload.data?.application_id },
  );
  const detailTitle =
    openingId && openingId !== "new"
      ? detail.data?.title
      : reviewId
        ? application.data?.profile.name
        : undefined;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <>
      <header className="sticky top-0 z-40 hidden h-[72px] shrink-0 items-center justify-between gap-3 border-b bg-background px-4 md:flex lg:px-8">
        <nav
          aria-label={t("design.breadcrumb")}
          className="flex min-w-0 items-center gap-3 text-sm"
        >
          <span className="text-muted-foreground">
            {t(`nav.${detailTitle ? current : group}`)}
          </span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-semibold">
            {detailTitle ?? t(`nav.${current}`)}
          </span>
          {pathname.startsWith("/dashboard/settings/") && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <span className="font-semibold">
                {t(`settings.${pathname.split("/").at(-1)}`)}
              </span>
            </>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("design.search")}
            className="flex h-10 w-10 items-center gap-2 rounded-[10px] border bg-card px-3 text-sm text-muted-foreground lg:w-48 xl:w-80"
          >
            <Search className="size-4 shrink-0" />
            <span className="hidden truncate lg:inline">
              {t("design.search")}
            </span>
            <kbd className="ml-auto hidden shrink-0 rounded border px-1 text-xs xl:block">
              Ctrl K
            </kbd>
          </button>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/review" />}
          >
            <span className="size-2 rounded-full bg-primary-foreground" />
            <ReviewCount />
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="icon"
            aria-label={t("design.notifications")}
            render={<Link href="/dashboard/review" />}
          >
            <Bell />
          </Button>
        </div>
      </header>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="frontdesk-dashboard">
          <DialogHeader>
            <DialogTitle>{t("design.search")}</DialogTitle>
            <DialogDescription>{t("design.searchHelp")}</DialogDescription>
          </DialogHeader>
          <Input
            ref={input}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("design.search")}
            aria-label={t("design.search")}
          />
          {open && (
            <SearchResults search={search} onSelect={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchResults({
  search,
  onSelect,
}: {
  search: string;
  onSelect: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const openings = useOpeningDirectory();
  const candidates = useResource<Page<CandidateSummary>>(candidatePagePath());
  const term = search.trim().toLocaleLowerCase();
  const results = [
    ...(openings.data ?? []).map((item) => ({
      id: item.id,
      name: item.title,
      description: t("nav.openings"),
      href: `/dashboard/openings/${item.id}`,
    })),
    ...(candidates.data?.items ?? []).map((item) => ({
      id: item.id,
      name: item.profile.name ?? t("candidates.unknown"),
      description: item.profile.email ?? t("nav.candidates"),
      href: `/dashboard/candidates/${item.id}`,
    })),
  ].filter((item) =>
    `${item.name} ${item.description}`.toLocaleLowerCase().includes(term),
  );
  return (
    <div className="max-h-80 overflow-y-auto">
      {(openings.isPending || candidates.isPending) && (
        <p className="p-3 text-sm text-muted-foreground">
          {t("table.loading")}
        </p>
      )}
      {(openings.error || candidates.error) && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {(openings.error || candidates.error)?.message}
        </p>
      )}
      {results.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onSelect}
          className="flex flex-col gap-1 rounded-xl p-3 hover:bg-muted"
        >
          <span className="text-sm font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">
            {item.description}
          </span>
        </Link>
      ))}
      {!results.length && !openings.isPending && !candidates.isPending && (
        <p className="p-3 text-sm text-muted-foreground">
          {t("design.noResults")}
        </p>
      )}
      <Link
        href="/dashboard/candidates"
        onClick={onSelect}
        className="block p-3 text-sm font-medium underline"
      >
        {t("design.allCandidates")}
      </Link>
    </div>
  );
}
