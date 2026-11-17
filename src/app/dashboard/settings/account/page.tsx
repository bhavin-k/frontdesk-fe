import { headers } from "next/headers";
import { requireSession } from "@/lib/auth/session";
import { getAuth } from "@/lib/auth/server";
import { readGoogleAuthConfig } from "@/lib/auth/config";
import { googleAuthError } from "@/lib/auth/google";
import { authCopy as copy } from "@/lib/copy";
import { GoogleAccount } from "@/components/google-account";
import { SectionBlock } from "@/components/section-block";

export default async function AccountSettingsPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ user }, requestHeaders, { error }] = await Promise.all([requireSession(), headers(), searchParams]);
  const accounts = await (await getAuth()).api.listUserAccounts({ headers: requestHeaders });
  return (
    <SectionBlock title={copy.accountSettings} description={copy.accountSettingsDescription}>
      <GoogleAccount
        email={user.email}
        enabled={Boolean(readGoogleAuthConfig())}
        linked={accounts.some((account) => account.providerId === "google")}
        initialError={googleAuthError(error)}
      />
    </SectionBlock>
  );
}
