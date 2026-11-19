import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { getDashboardBootstrap, getInitialRecruitmentIdentity, isCandidatesRequest } from "@/lib/recruitment-api";
import { BootstrapError } from "@/features/dashboard/bootstrap-error";
import { DashboardShell } from "@/components/dashboard-shell";
import { BusinessProvider } from "@/features/dashboard/business-context";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ user }, jar] = await Promise.all([requireSession(), cookies()]);
  const initialIdentity = await getInitialRecruitmentIdentity();
  if (await isCandidatesRequest() && (await getDashboardBootstrap()).error) {
    return <main className="p-8"><BootstrapError /></main>;
  }
  return (
    <BusinessProvider
      userId={user.id}
      initialIdentity={initialIdentity}
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
