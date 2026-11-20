"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  BriefcaseBusiness,
  Users,
  ClipboardCheck,
  CalendarDays,
  Phone,
  SlidersHorizontal,
  Blocks,
  Settings,
  ConciergeBell,
} from "lucide-react";
import { DashboardToolbar, ReviewCount } from "./dashboard-toolbar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar";
import { WorkspaceSwitcher } from "./layout/workspace-switcher";
import { SiteHeader } from "./site-header";
import { NavUser } from "./nav-user";
import { BusinessBoundary } from "@/features/dashboard/business-context";
import { Alert, AlertDescription } from "./ui/alert";

const groups = [
  {
    name: "recruitment",
    items: [
      ["overview", "/dashboard", Home],
      ["openings", "/dashboard/openings", BriefcaseBusiness],
      ["candidates", "/dashboard/candidates", Users],
      ["review", "/dashboard/review", ClipboardCheck],
    ],
  },
  {
    name: "screening",
    items: [
      ["interviews", "/dashboard/interviews", CalendarDays],
      ["calls", "/dashboard/screening-calls", Phone],
      ["interviewer", "/dashboard/interviewer-settings", SlidersHorizontal],
    ],
  },
  {
    name: "workspace",
    items: [
      ["integrations", "/dashboard/integrations", Blocks],
      ["settings", "/dashboard/settings/business", Settings],
    ],
  },
] as const;

function Navigation({
  user,
  fakeMode,
}: {
  user: { name: string; email: string };
  fakeMode: boolean;
}) {
  const { t } = useTranslation("dashboard");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar
      className="absolute inset-y-0 h-full"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="gap-5 p-3 pb-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 pt-1 group-data-[collapsible=icon]:hidden"
        >
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
            <ConciergeBell className="size-4" />
          </span>
          <span className="text-base font-bold tracking-tight">
            {t("common:appName")}
          </span>
        </Link>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.name} className="px-3">
            <SidebarGroupLabel>{t(`nav.${group.name}`)}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map(([key, path, Icon]) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    render={<Link href={path} />}
                    isActive={
                      path === "/dashboard"
                        ? pathname === path
                        : key === "settings"
                          ? pathname.startsWith("/dashboard/settings")
                          : pathname.startsWith(path)
                    }
                    tooltip={t(`nav.${key}`)}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <Icon />
                    <span>{t(`nav.${key}`)}</span>
                    {key === "review" && <ReviewCount badge />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3">
        {fakeMode && (
          <Alert className="border-0 bg-muted p-3 group-data-[collapsible=icon]:hidden">
            <p className="mb-1 text-sm font-semibold">
              {t("design.localMode")}
            </p>
            <AlertDescription className="text-xs leading-5">
              {t("recruitment:localNotice")}
            </AlertDescription>
          </Alert>
        )}
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function DashboardShell({
  user,
  sidebarOpen,
  fakeMode,
  children,
}: {
  user: { name: string; email: string };
  sidebarOpen: boolean;
  fakeMode: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const scroll = useRef<HTMLElement>(null);
  const navItems: ReadonlyArray<readonly [string, string, unknown]> =
    groups.flatMap(
      (group): ReadonlyArray<readonly [string, string, unknown]> => group.items,
    );
  const current = navItems.find(([key, path]) =>
    path === "/dashboard"
      ? pathname === path
      : key === "settings"
        ? pathname.startsWith("/dashboard/settings")
        : pathname.startsWith(path),
  );
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return (
    <div className="frontdesk-dashboard flex h-svh w-full flex-col overflow-hidden bg-background">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-xl focus:bg-background focus:p-4"
      >
        {t("accessibility.skipToContent")}
      </a>
      <SidebarProvider
        defaultOpen={sidebarOpen}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
      >
        <Navigation user={user} fakeMode={fakeMode} />
        <SidebarInset
          ref={scroll}
          className="@container/content min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <SiteHeader fixed scrollContainerRef={scroll} />
          <DashboardToolbar
            current={current?.[0] ?? "overview"}
            group={
              groups.find((group) =>
                group.items.some((item) => item[0] === current?.[0]),
              )?.name ?? "recruitment"
            }
          />
          <div
            id="dashboard-main-content"
            tabIndex={-1}
            className="mx-auto flex w-full flex-1 flex-col px-4 pt-6 pb-8 after:block after:h-10 after:shrink-0 after:content-[''] md:px-8 md:pt-8 md:after:h-12"
          >
            {pathname === "/dashboard/settings/account" ? (
              children
            ) : (
              <BusinessBoundary>{children}</BusinessBoundary>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
