"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { OverviewData } from "./overview";

export function OverviewCharts({ data }: { data: OverviewData }) {
  const { t } = useTranslation("dashboard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.intake")}</CardTitle>
        <CardDescription>{t("overview.intakeDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            cvs_received: {
              label: t("overview.received"),
              color: "var(--chart-1)",
            },
          }}
          className="h-64 w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data.daily_intake}
            margin={{ left: 0, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tickFormatter={(value: string) => value.slice(5)}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="cvs_received"
              stroke="var(--color-cvs_received)"
              fill="var(--color-cvs_received)"
              fillOpacity={0.15}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
