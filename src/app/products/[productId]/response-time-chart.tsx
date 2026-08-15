"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  responseTimeMs: {
    label: "Response time",
    color: "#f97316",
  },
} satisfies ChartConfig;

interface ResponseTimeChartProps {
  data: { label: string; responseTimeMs: number }[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          stroke="rgba(255,255,255,0.4)"
          fontSize={11}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="rgba(255,255,255,0.4)"
          fontSize={11}
          width={40}
          tickFormatter={(v) => `${v}ms`}
        />
        <ChartTooltip
          cursor={{ stroke: "rgba(255,255,255,0.2)" }}
          content={<ChartTooltipContent formatter={(value) => `${value}ms`} />}
        />
        <Line
          type="monotone"
          dataKey="responseTimeMs"
          stroke="var(--color-responseTimeMs)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: "var(--color-responseTimeMs)" }}
        />
      </LineChart>
    </ChartContainer>
  );
}
