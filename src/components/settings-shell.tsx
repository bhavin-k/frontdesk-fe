"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { PageHeader } from "./page-header";
import { cn } from "@/lib/utils";
export function SettingsShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("dashboard");
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("settings.title")} />
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <nav
        className="flex flex-wrap gap-1 md:w-56 md:shrink-0 md:flex-col"
        aria-label={t("settings.title")}
      >
        {(["business", "team", "retention", "account", "appearance"] as const).map(
          (key) => (
            <Link
              key={key}
              href={`/dashboard/settings/${key}`}
              aria-current={pathname.endsWith(`/${key}`) ? "page" : undefined}
              className={cn(
                "rounded-[10px] px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                pathname.endsWith(`/${key}`) &&
                  "bg-card font-semibold text-foreground ring-1 ring-border",
              )}
            >
              {t(`settings.${key}`)}
            </Link>
          ),
        )}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
