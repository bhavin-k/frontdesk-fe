"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronsUpDown, Contrast, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTheme } from "./theme-provider";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

export function NavUser({ user }: { user: { name: string; email: string } }) {
  const { t } = useTranslation("dashboard");
  const { isMobile, setOpenMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const query = useQueryClient();
  const hydrated = useHydrated();
  async function signOut() {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      query.clear();
      setOpenMobile(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error(t("common:errors.unexpected"));
    } finally {
      setPending(false);
    }
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!hydrated}
            render={
              <SidebarMenuButton
                className="data-[popup-open=true]:bg-sidebar-accent"
                size="lg"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback>
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-xl"
            align="end"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => {
                setOpenMobile(false);
                router.push("/dashboard/settings/account");
              }}>
                <UserRound />
                {t("account.account")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                <Contrast />
                {t("account.appearance")} ·{" "}
                {t(resolvedTheme === "dark" ? "account.light" : "account.dark")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={pending}
                onClick={() => {
                  void signOut();
                }}
              >
                <LogOut />
                {t("account.signOut")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
