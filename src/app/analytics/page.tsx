"use client";

import Link from "next/link";
import { ChartColumn, Layers, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useAuth } from "@/lib/auth-context";

const CARDS = [
  {
    title: "Income",
    description: "Track income across every month of a year, and set a yearly target.",
    icon: TrendingUp,
    href: "/analytics/income",
    financeOnly: true,
  },
  {
    title: "Board Overview",
    description: "See how many Epics, PBIs, and Tasks are in each status at a glance.",
    icon: Layers,
    href: "/analytics/board",
  },
];

export default function AnalyticsPage() {
  const { hasFinanceAccess } = useAuth();
  const cards = CARDS.filter((card) => !card.financeOnly || hasFinanceAccess);

  return (
      <PageBackground>
        <PageHeader title="Analytics" icon={ChartColumn} />

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 p-8 sm:grid-cols-2">
          {cards.map(({ title, description, icon: Icon, href }) => (
            <Link
              key={title}
              href={href}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-sm text-white/50">{description}</p>
            </Link>
          ))}
        </div>
      </PageBackground>
  );
}
