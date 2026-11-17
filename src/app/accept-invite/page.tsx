import { AuthStatusCard } from "@/components/auth-status-card";
import { AuthShell } from "@/components/auth-shell";
export default function Page() {
  return (
    <AuthShell>
      <AuthStatusCard kind="invite" />
    </AuthShell>
  );
}
