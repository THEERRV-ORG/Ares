"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useDbList } from "@/lib/use-db";
import { BOARD_STATUSES, BOARD_STATUS_STYLES, type BoardStatus, type Epic, type Pbi, type Task } from "@/lib/board-types";

function countByStatus(items: { status: BoardStatus }[]) {
  const counts = Object.fromEntries(BOARD_STATUSES.map((s) => [s, 0])) as Record<BoardStatus, number>;
  for (const item of items) {
    const status = item.status ?? "Not Started";
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

function StatusBreakdown({
  title,
  items,
}: {
  title: string;
  items: { status: BoardStatus }[];
}) {
  const counts = useMemo(() => countByStatus(items), [items]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <h2 className="text-sm font-medium text-white/70">
        {title} ({items.length})
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BOARD_STATUSES.map((status) => (
          <div
            key={status}
            className="flex flex-col gap-1 rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <span
              className={`w-fit rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[status]}`}
            >
              {status}
            </span>
            <span className="text-2xl font-semibold text-white">{counts[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BoardOverviewPage() {
  const epics = useDbList<Epic>("epics");
  const pbis = useDbList<Pbi>("pbis");
  const tasks = useDbList<Task>("tasks");

  return (
    <PageBackground>
      <PageHeader title="Board Overview" icon={Layers} backHref="/analytics" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
          <StatusBreakdown title="Epics" items={epics} />
          <StatusBreakdown title="PBIs" items={pbis} />
          <StatusBreakdown title="Tasks" items={tasks} />
        </div>
      </div>
    </PageBackground>
  );
}
