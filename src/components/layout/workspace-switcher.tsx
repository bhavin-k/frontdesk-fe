"use client";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Plus, BriefcaseBusiness } from "lucide-react";
import { useBusiness } from "@/features/dashboard/business-context";
import { SidebarTeamSkeleton } from "@/components/loading-skeletons";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
export function WorkspaceSwitcher() {
  const { t } = useTranslation("dashboard");
  const state = useBusiness();
  if (state.pending) return <SidebarTeamSkeleton />;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="rounded-xl border bg-muted/40"
                aria-label={t("workspace.switch")}
                data-testid="business-switcher"
              />
            }
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-neutral text-white">
              {state.business?.name ? (
                <span className="text-xs font-bold">
                  {state.business.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()}
                </span>
              ) : (
                <BriefcaseBusiness className="size-4" />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {state.business?.name ?? t("workspace.choose")}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {t("workspace.role")}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="min-w-64 rounded-xl"
          >
            <DropdownMenuGroup>
              {state.memberships.map((business) => (
                <DropdownMenuItem
                  key={business.tenant_id}
                  onClick={() => state.switchBusiness(business.tenant_id)}
                >
                  <span className="flex-1 truncate">{business.name}</span>
                  {business.tenant_id === state.business?.tenant_id && (
                    <Check />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={state.openCreate}>
                <Plus />
                {t("workspace.new")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
