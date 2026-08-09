"use client";

import Link from "next/link";
import { Sparkles, Layers, Kanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";

const CARDS = [
  {
    title: "Requirement → Epic",
    description: "Paste a requirement and let Ares draft an Epic. Review, edit, then approve.",
    icon: Sparkles,
    href: "/board/requirement",
  },
  {
    title: "Create & View Epic / PBI",
    description: "Browse epics, drill into PBIs and tasks, edit anything, delete what you don't need.",
    icon: Layers,
    href: "/board/epics",
  },
];

export default function BoardPage() {
  return (
      <PageBackground>
        <PageHeader title="Work Tracker" icon={Kanban} />

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 p-8 sm:grid-cols-2">
          {CARDS.map(({ title, description, icon: Icon, href }) => {
            const cardClasses =
              "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors";
            const content = (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="text-sm text-white/50">{description}</p>
              </>
            );

            return href ? (
              <Link
                key={title}
                href={href}
                className={`${cardClasses} hover:border-orange-500/40 hover:bg-white/[0.07]`}
              >
                {content}
              </Link>
            ) : (
              <div key={title} className={`${cardClasses} opacity-60`}>
                {content}
                <span className="text-xs font-medium text-white/30">Coming soon</span>
              </div>
            );
          })}
        </div>
      </PageBackground>
  );
}
