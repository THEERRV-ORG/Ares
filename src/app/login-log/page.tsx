"use client";

import { useEffect } from "react";
import { collection, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import type { LoginLogEntry } from "@/lib/login-log-types";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function formatFullTimestamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseDevice(userAgent: string | null) {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Unknown browser";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown device";
  return `${browser} · ${os}`;
}

export default function LoginLogPage() {
  const entries = useDbList<LoginLogEntry>(
    "loginLogs",
    (a, b) => b.signedInAt - a.signedInAt,
  );

  // Best-effort housekeeping: whenever a member opens this page, quietly prune sign-in
  // records older than the retention window. Firestore rules independently enforce that
  // only entries actually past that age can be deleted, so a bug here can't remove recent ones.
  useEffect(() => {
    const staleQuery = query(
      collection(db, "loginLogs"),
      where("signedInAt", "<", Date.now() - RETENTION_MS),
    );
    getDocs(staleQuery)
      .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))))
      .catch(() => {});
  }, []);

  return (
    <PageBackground>
      <PageHeader title="Login Log" icon={History} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
          <p className="text-xs text-white/30">
            Every sign-in attempt is recorded here — including accounts that aren&apos;t
            approved members — so it&apos;s easy to spot duplicate or unexpected logins.
          </p>

          {entries.length === 0 ? (
            <p className="text-sm text-white/40">No sign-ins recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((entry) => {
                const device = parseDevice(entry.userAgent);
                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    {entry.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.photoURL}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {entry.displayName ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-white/40">{entry.email ?? "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-right">
                      <span className="text-xs text-white/70">
                        {formatFullTimestamp(entry.signedInAt)}
                      </span>
                      {device && <span className="text-xs text-white/30">{device}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}
