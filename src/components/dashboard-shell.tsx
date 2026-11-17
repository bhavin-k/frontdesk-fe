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
} from "lucide-react";
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

function Navigation({ user }: { user: { name: string; email: string } }) {
  const { t } = useTranslation("dashboard");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar
      className="absolute inset-y-0 h-full"
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.name}>
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
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
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
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
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
        <Navigation user={user} />
        <SidebarInset
          ref={scroll}
          className="@container/content min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <SiteHeader fixed scrollContainerRef={scroll} />
          <header className="hidden h-16 shrink-0 items-center justify-end border-b px-6 md:flex">
            <span className="text-sm font-medium">{t("appName")}</span>
          </header>
          <div
            id="dashboard-main-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-4 pb-6 after:block after:h-10 after:shrink-0 after:content-[''] md:px-6 md:pt-6 md:after:h-12"
          >
            {fakeMode && (
              <Alert className="mb-6">
                <AlertDescription>
                  {t("recruitment:localNotice")}
                </AlertDescription>
              </Alert>
            )}
            {pathname === "/dashboard/settings/account" ? children : <BusinessBoundary>{children}</BusinessBoundary>}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
