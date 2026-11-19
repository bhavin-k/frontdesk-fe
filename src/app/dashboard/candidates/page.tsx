import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { CandidatesPage } from "@/features/dashboard/candidates";
import { TableCardSkeleton } from "@/components/loading-skeletons";
import { candidatePagePath, recruitmentQueryKey, tenantPath } from "@/features/recruitment/api";
import { getDashboardBootstrap } from "@/lib/recruitment-api";
import { BootstrapError } from "@/features/dashboard/bootstrap-error";

async function InitialCandidates() {
  const bootstrap = await getDashboardBootstrap();
  if (bootstrap.error || bootstrap.candidateError) return <BootstrapError />;
  const initial = bootstrap.initialCandidates;
  if (!initial) return <CandidatesPage />;
  const query = new QueryClient();
  query.setQueryData(
    recruitmentQueryKey(initial.userId, tenantPath(initial.tenantId), candidatePagePath()),
    initial.data,
    { updatedAt: initial.updatedAt },
  );
  return (
    <HydrationBoundary state={dehydrate(query)}>
      <CandidatesPage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<TableCardSkeleton />}>
      <InitialCandidates />
    </Suspense>
  );
}
