"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { RequireWebsiteAccess } from "@/components/require-website-access";
import { samplePosts } from "@/lib/website-posts-sample";
import type { Post } from "@/lib/website-posts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_STYLES: Record<Post["kind"], string> = {
  blog: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  "case-study": "border-violet-500/30 bg-violet-500/10 text-violet-200",
};

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function editHref(p: Post) {
  return `/website/${p.kind === "case-study" ? "case-studies" : "blog"}/${p.slug}`;
}

/** Six weeks starting on the Monday on or before the 1st, so every month fits the same grid. */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function ContentCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const posts = useMemo(() => [...samplePosts("blog"), ...samplePosts("case-study")], []);
  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) map.set(p.date, [...(map.get(p.date) ?? []), p]);
    return map;
  }, [posts]);

  const days = monthGrid(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const inMonth = posts.filter((p) => p.date.startsWith(monthPrefix));
  const upcoming = posts
    .filter((p) => p.status !== "Published")
    .sort((a, b) => a.date.localeCompare(b.date));

  // Longest stretch of this month without anything going out — a nudge to fill the gap.
  const longestGap = useMemo(() => {
    const dates = inMonth
      .filter((p) => p.status !== "Draft")
      .map((p) => Number(p.date.slice(8, 10)))
      .sort((a, b) => a - b);
    const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const points = [0, ...dates, lastDay + 1];
    let gap = 0;
    for (let i = 1; i < points.length; i++) gap = Math.max(gap, points[i] - points[i - 1] - 1);
    return gap;
  }, [inMonth, cursor]);

  function shift(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <PageBackground>
      <PageHeader title="Content Calendar" icon={CalendarDays} backHref="/website" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-white">{monthLabel}</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shift(-1)}
                  title="Previous month"
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
                  className="rounded-lg px-2.5 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                >
                  Today
                </button>
                <button
                  onClick={() => shift(1)}
                  title="Next month"
                  className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-sky-400/60" /> Blog post
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-violet-400/60" /> Case study
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-white/50" /> Upcoming
                </span>
              </div>
            </div>

            {/* Phones: agenda list of this month's days that have something on them. */}
            <div className="flex flex-col gap-2 sm:hidden">
              {inMonth.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/40">
                  Nothing planned this month.
                </p>
              ) : (
                [...new Set(inMonth.map((p) => p.date))].sort().map((date) => {
                  const d = new Date(date);
                  const isToday = date === toKey(today);
                  return (
                    <div
                      key={date}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-sm"
                    >
                      <div
                        className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 ${
                          isToday ? "bg-orange-500 text-white" : "bg-white/5 text-white/70"
                        }`}
                      >
                        <span className="text-[10px] uppercase">
                          {d.toLocaleDateString("en-GB", { weekday: "short" })}
                        </span>
                        <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {(byDay.get(date) ?? []).map((p) => (
                          <Link
                            key={p.slug}
                            href={editHref(p)}
                            className={`rounded-lg border px-2.5 py-1.5 text-sm leading-snug ${KIND_STYLES[p.kind]} ${
                              p.status === "Published" ? "" : "border-dashed"
                            }`}
                          >
                            <span className="block text-[11px] opacity-70">
                              {p.kind === "case-study" ? "Case study" : "Blog"}
                              {p.status !== "Published" && ` · ${p.status}`}
                            </span>
                            {p.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm sm:block">
              <div className="grid grid-cols-7 border-b border-white/10">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-xs font-medium text-white/40">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const key = toKey(d);
                  const items = byDay.get(key) ?? [];
                  const outside = d.getMonth() !== cursor.month;
                  const isToday = key === toKey(today);
                  return (
                    <div
                      key={key}
                      className={`group relative min-h-28 border-white/5 p-1.5 ${i % 7 !== 6 ? "border-r" : ""} ${i < 35 ? "border-b" : ""} ${outside ? "bg-white/[0.015]" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            isToday
                              ? "bg-orange-500 font-semibold text-white"
                              : outside
                                ? "text-white/20"
                                : "text-white/60"
                          }`}
                        >
                          {d.getDate()}
                        </span>
                        {!outside && (
                          <Link
                            href="/website/blog/new"
                            title="New post"
                            className="rounded p-0.5 text-white/30 opacity-0 transition-opacity hover:text-orange-300 group-hover:opacity-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col gap-1">
                        {items.map((p) => (
                          <Link
                            key={p.slug}
                            href={editHref(p)}
                            title={`${p.title} — ${p.status}`}
                            className={`truncate rounded-md border px-1.5 py-1 text-[11px] leading-tight transition-opacity hover:opacity-80 ${KIND_STYLES[p.kind]} ${
                              p.status === "Published" ? "" : "border-dashed"
                            } ${outside ? "opacity-50" : ""}`}
                          >
                            {p.status !== "Published" && (
                              <span className="mr-1 font-semibold">{p.status === "Draft" ? "Draft ·" : "⏰"}</span>
                            )}
                            {p.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white/90">This month</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { n: inMonth.filter((p) => p.status === "Published").length, label: "Published" },
                  { n: inMonth.filter((p) => p.status === "Scheduled").length, label: "Scheduled" },
                  { n: inMonth.filter((p) => p.status === "Draft").length, label: "Drafts" },
                ].map(({ n, label }) => (
                  <div key={label} className="rounded-xl bg-white/5 py-3">
                    <p className="text-xl font-bold text-white">{n}</p>
                    <p className="text-[11px] text-white/45">{label}</p>
                  </div>
                ))}
              </div>
              {longestGap >= 10 && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {longestGap} days in a row with nothing going out this month. Posting at least weekly keeps
                  the site fresh for Google.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white/90">Coming up</h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-white/40">Nothing scheduled or in draft.</p>
              ) : (
                upcoming.map((p) => (
                  <Link
                    key={p.slug}
                    href={editHref(p)}
                    className="flex flex-col gap-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <span className="text-[11px] text-white/40">
                      {p.status === "Scheduled" ? "Goes live" : "Draft for"}{" "}
                      {new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
                      {p.kind === "case-study" ? "Case study" : "Blog"}
                    </span>
                    <span className="line-clamp-2 text-sm text-white/85">{p.title}</span>
                  </Link>
                ))
              )}
            </section>
          </aside>
        </div>
      </div>
    </PageBackground>
  );
}

export default function CalendarPage() {
  return (
    <RequireWebsiteAccess>
      <ContentCalendar />
    </RequireWebsiteAccess>
  );
}
