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
      <nav
        className="flex flex-wrap gap-2 border-b pb-4"
        aria-label={t("settings.title")}
      >
        {(["business", "team", "retention", "account", "appearance"] as const).map(
          (key) => (
            <Link
              key={key}
              href={`/dashboard/settings/${key}`}
              aria-current={pathname.endsWith(`/${key}`) ? "page" : undefined}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                pathname.endsWith(`/${key}`) && "bg-muted text-foreground",
              )}
            >
              {t(`settings.${key}`)}
            </Link>
          ),
        )}
      </nav>
      {children}
    </div>
  );
}
