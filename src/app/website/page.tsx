"use client";

import Link from "next/link";
import { BookOpenText, CalendarDays, FileText, Inbox, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { RequireWebsiteAccess } from "@/components/require-website-access";

const CARDS = [
  {
    title: "Contact Inbox",
    description: "Messages sent through the contact form on theerrv.com. Triage, assign, and reply.",
    icon: Inbox,
    href: "/website/inbox",
  },
  {
    title: "Blog Posts",
    description: "Write, preview, and publish articles to the Insights section of theerrv.com.",
    icon: FileText,
    href: "/website/blog",
  },
  {
    title: "Case Studies",
    description: "Showcase client projects with results, testimonials, and the story behind the build.",
    icon: BookOpenText,
    href: "/website/case-studies",
  },
  {
    title: "Content Calendar",
    description: "See scheduled, published, and draft posts by month — and spot the gaps.",
    icon: CalendarDays,
    href: "/website/calendar",
  },
];

export default function WebsitePage() {
  return (
    <RequireWebsiteAccess>
      <PageBackground>
        <PageHeader title="Website" icon={Newspaper} />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 p-8 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </PageBackground>
    </RequireWebsiteAccess>
  );
}
