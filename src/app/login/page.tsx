import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/auth/session";
import { readGoogleAuthConfig } from "@/lib/auth/config";
import { googleAuthError } from "@/lib/auth/google";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <AuthShell>
      <AuthForm mode="login" googleEnabled={Boolean(readGoogleAuthConfig())} initialError={googleAuthError(error)} />
    </AuthShell>
  );
}
