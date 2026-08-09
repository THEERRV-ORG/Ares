"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatINR } from "@/lib/format";

const chartConfig = {
  income: {
    label: "Income",
    color: "#f97316",
  },
} satisfies ChartConfig;

interface IncomeByMonthChartProps {
  data: { month: string; income: number }[];
  year: string | number;
  targetPerMonth?: number;
}

export function IncomeByMonthChart({ data, year, targetPerMonth }: IncomeByMonthChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          stroke="rgba(255,255,255,0.4)"
          fontSize={12}
        />
        <ChartTooltip
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          content={
            <ChartTooltipContent
              formatter={(value) => formatINR(Number(value))}
              labelFormatter={(label) => `${label} · ${year}`}
            />
          }
        />
        {targetPerMonth != null && targetPerMonth > 0 && (
          <ReferenceLine
            y={targetPerMonth}
            stroke="#f97316"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{
              value: `Needed: ${formatINR(targetPerMonth)}`,
              position: "insideTopRight",
              fill: "#fdba74",
              fontSize: 11,
            }}
          />
        )}
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
