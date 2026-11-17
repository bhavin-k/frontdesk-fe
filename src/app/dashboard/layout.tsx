import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { BusinessProvider } from "@/features/dashboard/business-context";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ user }, jar] = await Promise.all([requireSession(), cookies()]);
  return (
    <BusinessProvider
      userId={user.id}
      initialBusinessId={jar.get("recruitment-business")?.value}
    >
      <DashboardShell
        fakeMode={process.env.RECRUITMENT_PROVIDER_MODE === "fake"}
        user={{ name: user.name, email: user.email }}
        sidebarOpen={jar.get("sidebar_state")?.value !== "false"}
      >
        {children}
      </DashboardShell>
    </BusinessProvider>
  );
}
