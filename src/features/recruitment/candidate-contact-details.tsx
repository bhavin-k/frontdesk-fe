"use client";

import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Application } from "./types";

export function CandidateContactDetails({
  profile,
}: {
  profile: Pick<Application["profile"], "email" | "phone" | "mobile">;
}) {
  const { t } = useTranslation("intake");
  const email = profile.email?.trim();
  const phone = (profile.phone ?? profile.mobile)?.trim();
  const missing = email
    ? phone
      ? null
      : "missingPhone"
    : phone
      ? "missingEmail"
      : "missingContacts";

  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm">
      {email ? <p className="wrap-anywhere">{email}</p> : null}
      {phone ? <p>{phone}</p> : null}
      {missing ? (
        <Alert role="note">
          <AlertDescription>{t(missing)}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
