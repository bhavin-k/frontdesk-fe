"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useResource } from "./ui";
import type { OverviewData } from "./overview";

export function ScreeningIntroduction() {
  const { t } = useTranslation("dashboard");
  const overview = useResource<OverviewData>("/overview");
  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-center gap-8 rounded-[24px] bg-muted p-6 md:p-10">
        <div className="flex flex-1 flex-col items-start gap-4">
          <span className="rounded-full bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
            {t("design.laterRelease")}
          </span>
          <h1 className="max-w-2xl text-3xl leading-tight font-semibold tracking-tight">
            {t("design.screeningTitle")}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {t("design.screeningDescription")}
          </p>
          {overview.data && (
            <p className="text-sm font-medium">
              {t("design.screeningCount", {
                count: overview.data.totals.shortlisted,
              })}
            </p>
          )}
        </div>
        <svg
          viewBox="0 0 240 190"
          aria-hidden="true"
          className="hidden w-56 shrink-0 lg:block"
        >
          <rect
            x="7"
            y="5"
            width="103"
            height="179"
            rx="20"
            fill="white"
            stroke="#ccc"
            strokeWidth="2"
          />
          <rect x="41" y="16" width="34" height="6" rx="3" fill="#ddd" />
          <circle cx="58" cy="62" r="20" fill="#eee" />
          <circle cx="58" cy="58" r="8" fill="#999" />
          <path d="M44 76a14 12 0 0 1 28 0" fill="#999" />
          {[18, 32, 44, 27, 20].map((h, i) => (
            <rect
              key={i}
              x={34 + i * 11}
              y={119 - h / 2}
              width="5"
              height={h}
              rx="2"
              fill="#999"
            />
          ))}
          <circle cx="58" cy="162" r="12" fill="#141414" />
          <rect
            x="128"
            y="42"
            width="105"
            height="96"
            rx="14"
            fill="white"
            stroke="#ccc"
            strokeWidth="2"
          />
          <path d="M142 42h77q14 0 14 14v11H128V56q0-14 14-14" fill="#999" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect
              key={i}
              x={140 + (i % 4) * 21}
              y={78 + Math.floor(i / 4) * 21}
              width="15"
              height="14"
              rx="4"
              fill={i === 2 ? "#141414" : "#e6e6e6"}
            />
          ))}
          <circle cx="217" cy="142" r="16" fill="#666" />
          <path
            d="M217 133v10l6 4"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </section>
      <section>
        <h2 className="mb-5 text-xl font-semibold">{t("design.howWorks")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((step) => (
            <article key={step} className="rounded-[20px] border bg-card p-6">
              <h3 className="mb-4 flex items-center gap-3 text-base font-semibold">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm ${step === 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {step}
                </span>
                {t(`design.step${step}`)}
              </h3>
              <p className="text-sm leading-6">{t(`design.step${step}Body`)}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t(`design.step${step}Need`)}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] border bg-card p-6">
        <div>
          <h2 className="mb-1 font-semibold">{t("design.getReady")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("design.getReadyBody")}
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/dashboard/openings" />}
        >
          {t("design.addQuestions")}
        </Button>
      </section>
    </div>
  );
}
