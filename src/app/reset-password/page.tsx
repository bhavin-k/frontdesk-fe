import { AuthStatusCard } from "@/components/auth-status-card";
import { AuthShell } from "@/components/auth-shell";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell>
      <AuthStatusCard
        kind="reset"
        token={
          typeof token === "string" && token.length <= 512 ? token : undefined
        }
      />
    </AuthShell>
  );
}
