"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenText, ChevronRight, FileText, Loader2, Plus, Search, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { coverSrc } from "@/components/website/article-preview";
import { usePosts } from "@/lib/website-api";
import { POST_STATUSES, POST_STATUS_STYLES, type PostKind, type PostStatus } from "@/lib/website-posts";

const COPY: Record<PostKind, { title: string; noun: string; base: string; empty: string }> = {
  blog: {
    title: "Blog Posts",
    noun: "post",
    base: "/website/blog",
    empty: "No blog posts yet — write the first one.",
  },
  "case-study": {
    title: "Case Studies",
    noun: "case study",
    base: "/website/case-studies",
    empty: "No case studies yet — add your first project.",
  },
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PostList({ kind }: { kind: PostKind }) {
  const copy = COPY[kind];
  const { posts: all, error, reload } = usePosts();
  const posts = useMemo(
    () => (all ?? []).filter((p) => p.kind === kind).sort((a, b) => b.date.localeCompare(a.date)),
    [all, kind],
  );
  const [statusFilter, setStatusFilter] = useState<PostStatus | "All">("All");
  const [search, setSearch] = useState("");

  const visible = posts.filter((p) => {
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.title, p.category, p.client, p.excerpt].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <PageBackground>
      <PageHeader
        title={copy.title}
        icon={kind === "blog" ? FileText : BookOpenText}
        backHref="/website"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white/90">
              {copy.title} {posts.length > 0 && `(${posts.length})`}
            </h2>
            <Link
              href={`${copy.base}/new`}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
            >
              <Plus className="h-4 w-4" />
              New {copy.noun}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["All", ...POST_STATUSES] as const).map((f) => {
              const count = f === "All" ? posts.length : posts.filter((p) => p.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    statusFilter === f
                      ? "bg-orange-500/15 text-orange-300"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  {f} {count > 0 && <span className="opacity-60">({count})</span>}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={kind === "blog" ? "Search title, category…" : "Search title, client…"}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button onClick={reload} className="shrink-0 underline opacity-80 hover:opacity-100">
                Retry
              </button>
            </div>
          )}

          {all === null && !error ? (
            <p className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading from the website repo…
            </p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-white/40">
              {posts.length === 0 ? copy.empty : "Nothing matches this filter."}
            </p>
          ) : (
            visible.map((p) => (
              <Link
                key={p.slug}
                href={`${copy.base}/${p.slug}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07] sm:gap-4"
              >
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-indigo-950 to-slate-900 sm:h-16 sm:w-28">
                  {p.cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- remote site path
                    <img src={coverSrc(p.cover)} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${POST_STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-white/40">
                      {kind === "case-study" ? p.client : p.category}
                    </span>
                    {p.hasDraftChanges && (
                      <span className="rounded-full border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300">
                        Unpublished changes
                      </span>
                    )}
                    {p.featured && (
                      <span className="flex items-center gap-1 text-xs text-amber-300">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 line-clamp-2 font-medium leading-snug text-white sm:line-clamp-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-white/40">
                    {p.status === "Scheduled" ? "Goes live " : ""}
                    {formatDate(p.date)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            ))
          )}
        </div>
      </div>
    </PageBackground>
  );
}
