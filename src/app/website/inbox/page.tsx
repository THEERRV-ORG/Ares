"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Inbox, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { RequireWebsiteAccess } from "@/components/require-website-access";
import { AssigneeBadges } from "@/components/assignee-badges";
import { useDbList } from "@/lib/use-db";
import {
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_STYLES,
  type ContactSubmission,
  type SubmissionStatus,
} from "@/lib/website-types";

type StatusFilter = SubmissionStatus | "All" | "Open";

const byNewest = (a: ContactSubmission, b: ContactSubmission) => b.createdAt - a.createdAt;

function formatReceived(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: ContactSubmission[]) {
  const header = ["Received", "Name", "Company", "Email", "Phone", "Service", "Status", "Assignee", "Message"];
  const lines = rows.map((s) =>
    [
      new Date(s.createdAt).toISOString(),
      s.fullName,
      s.company,
      s.email,
      s.phone,
      s.service,
      s.status,
      s.assignee ?? "",
      s.details,
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function InboxList() {
  const submissions = useDbList<ContactSubmission>("contactSubmissions", byNewest);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Open");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of submissions) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [submissions]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter === "Open" && (s.status === "Closed" || s.status === "Spam")) return false;
      if (statusFilter !== "Open" && statusFilter !== "All" && s.status !== statusFilter) return false;
      if (!q) return true;
      return [s.fullName, s.company, s.email, s.phone, s.service, s.details].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [submissions, statusFilter, search]);

  const filters: StatusFilter[] = ["Open", ...SUBMISSION_STATUSES, "All"];

  return (
    <PageBackground>
      <PageHeader title="Contact Inbox" icon={Inbox} backHref="/website" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => {
              const count =
                f === "All"
                  ? submissions.length
                  : f === "Open"
                    ? submissions.length - (counts.Closed ?? 0) - (counts.Spam ?? 0)
                    : (counts[f] ?? 0);
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
            <button
              onClick={() => downloadCsv(visible)}
              disabled={visible.length === 0}
              title="Export the current list as CSV"
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-white/50 transition-colors enabled:hover:bg-white/10 enabled:hover:text-white/80 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company, email, message…"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
            />
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-white/40">
              {submissions.length === 0
                ? "No messages yet — submissions from the theerrv.com contact form will appear here."
                : "No messages match this filter."}
            </p>
          ) : (
            visible.map((s) => (
              <Link
                key={s.id}
                href={`/website/inbox/${s.id}`}
                className={`flex items-center gap-3 rounded-xl border bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07] ${
                  s.status === "New" ? "border-sky-500/30" : "border-white/10"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`text-lg text-white ${s.status === "New" ? "font-semibold" : "font-medium"}`}>
                      {s.fullName}
                    </h2>
                    {s.company && <span className="text-sm text-white/50">{s.company}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${SUBMISSION_STATUS_STYLES[s.status]}`}>
                      {s.status}
                    </span>
                    {s.service && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                        {s.service}
                      </span>
                    )}
                    {s.status === "Spam" && (s.spamReasons?.length ?? 0) > 0 && (
                      <span
                        title={s.spamReasons!.join(" · ")}
                        className="rounded-full border border-red-500/20 px-2 py-0.5 text-xs text-red-300/80"
                      >
                        Auto-flagged
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-white/50">{s.details}</p>
                  <div className="flex items-center gap-2">
                    <span className="mt-1 text-xs text-white/30">{formatReceived(s.createdAt)}</span>
                    <AssigneeBadges names={s.assignee ? [s.assignee] : []} />
                  </div>
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

export default function InboxPage() {
  return (
    <RequireWebsiteAccess>
      <InboxList />
    </RequireWebsiteAccess>
  );
}
