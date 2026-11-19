"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ErrorNotice, PageIntro } from "./ui";

export function BootstrapError() {
  const router = useRouter();
  const { t } = useTranslation(["dashboard", "common"]);
  return (
    <div className="flex flex-col gap-6">
      <PageIntro title={t("dashboard:candidates.title")} />
      <ErrorNotice error={new Error(t("common:errors.unexpected"))} retry={() => router.refresh()} />
    </div>
  );
}
