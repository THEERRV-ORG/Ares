"use client";

import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Map } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { AssigneeBadges } from "@/components/assignee-badges";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import {
  BOARD_STATUS_STYLES,
  ROADMAP_TIMEFRAMES,
  type Epic,
  type RoadmapTimeframe,
} from "@/lib/board-types";

const COLUMNS = [...ROADMAP_TIMEFRAMES, "Unscheduled"] as const;

const COLUMN_STYLES: Record<(typeof COLUMNS)[number], string> = {
  Now: "border-emerald-500/30",
  Next: "border-amber-500/30",
  Later: "border-sky-500/30",
  Unscheduled: "border-white/10",
};

async function setTimeframe(epicId: string, timeframe: RoadmapTimeframe | null) {
  await updateDoc(doc(db, "epics", epicId), { timeframe });
}

export default function RoadmapPage() {
  const epics = useDbList<Epic>("epics", (a, b) => b.createdAt - a.createdAt);

  return (
    <PageBackground>
      <PageHeader title="Roadmap" icon={Map} backHref="/board" />

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex min-h-full gap-4 p-6">
          {COLUMNS.map((column) => {
            const columnEpics = epics.filter((e) =>
              column === "Unscheduled" ? !e.timeframe : e.timeframe === column,
            );
            return (
              <div
                key={column}
                className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl border bg-white/5 p-4 backdrop-blur-sm ${COLUMN_STYLES[column]}`}
              >
                <h2 className="text-sm font-semibold text-white/90">
                  {column} {columnEpics.length > 0 && `(${columnEpics.length})`}
                </h2>

                <div className="flex flex-col gap-2">
                  {columnEpics.length === 0 && (
                    <p className="text-xs text-white/30">No epics here.</p>
                  )}
                  {columnEpics.map((epic) => (
                    <div
                      key={epic.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3"
                    >
                      <Link
                        href={`/board/epics/${epic.id}`}
                        className="text-sm font-medium text-white hover:text-orange-300"
                      >
                        {epic.title}
                      </Link>
                      <span
                        className={`w-fit rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[epic.status ?? "Not Started"]}`}
                      >
                        {epic.status ?? "Not Started"}
                      </span>
                      <AssigneeBadges names={epic.assignees ?? []} />
                      <select
                        value={epic.timeframe ?? ""}
                        onChange={(e) =>
                          setTimeframe(epic.id, (e.target.value || null) as RoadmapTimeframe | null)
                        }
                        className="mt-1 w-fit rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:border-orange-500/50 focus:outline-none"
                      >
                        <option value="" className="bg-black">
                          Unscheduled
                        </option>
                        {ROADMAP_TIMEFRAMES.map((t) => (
                          <option key={t} value={t} className="bg-black">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageBackground>
  );
}
