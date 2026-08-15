"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection } from "firebase/firestore";
import { Layers, ChevronRight, Loader2, Plus, Search, User, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { AssigneeMultiSelect, displayNameOf } from "@/components/assignee-picker";
import { AssigneeBadges } from "@/components/assignee-badges";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useApprovedUsers, useDbList } from "@/lib/use-db";
import {
  BOARD_STATUSES,
  BOARD_STATUS_STYLES,
  ROADMAP_TIMEFRAMES,
  type BoardStatus,
  type Epic,
  type Pbi,
  type RoadmapTimeframe,
  type Task,
  type UserProfile,
} from "@/lib/board-types";

export default function EpicsPage() {
  const { user } = useAuth();
  const epics = useDbList<Epic>("epics", (a, b) => b.createdAt - a.createdAt);
  const pbis = useDbList<Pbi>("pbis", (a, b) => b.createdAt - a.createdAt);
  const tasks = useDbList<Task>("tasks", (a, b) => b.createdAt - a.createdAt);
  const users = useApprovedUsers<UserProfile & { id: string }>();
  const people = useMemo(
    () => [...users].map(displayNameOf).sort((a, b) => a.localeCompare(b)),
    [users],
  );

  const [showAddEpic, setShowAddEpic] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<BoardStatus>("Not Started");
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newTimeframe, setNewTimeframe] = useState<RoadmapTimeframe | "">("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");

  const filteredEpics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return epics;
    return epics.filter(
      (epic) =>
        epic.title.toLowerCase().includes(q) || epic.description.toLowerCase().includes(q),
    );
  }, [epics, search]);

  const personEpics = useMemo(
    () => epics.filter((e) => (e.assignees ?? []).includes(selectedPerson)),
    [epics, selectedPerson],
  );
  const personPbis = useMemo(
    () => pbis.filter((p) => p.assignee === selectedPerson),
    [pbis, selectedPerson],
  );
  const personTasks = useMemo(
    () => tasks.filter((t) => t.assignee === selectedPerson),
    [tasks, selectedPerson],
  );
  const pbiIdToEpicId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pbis) map.set(p.id, p.epicId);
    return map;
  }, [pbis]);

  async function addEpic() {
    if (!newTitle.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      await addDoc(collection(db, "epics"), {
        title: newTitle,
        description: newDescription,
        sourceRequirement: "",
        status: newStatus,
        assignees: newAssignees,
        timeframe: newTimeframe || null,
        createdBy: user?.email ?? null,
        createdAt: Date.now(),
      });
      setNewTitle("");
      setNewDescription("");
      setNewStatus("Not Started");
      setNewAssignees([]);
      setNewTimeframe("");
      setShowAddEpic(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add epic");
    } finally {
      setIsAdding(false);
    }
  }

  return (
      <PageBackground>
        <PageHeader title="Create & View Epic / PBI" icon={Layers} backHref="/board" />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/90">
                Epics {epics.length > 0 && `(${epics.length})`}
              </h2>
              <button
                onClick={() => setShowAddEpic((v) => !v)}
                title={showAddEpic ? "Close" : "Add Epic"}
                className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 hover:text-orange-400"
              >
                {showAddEpic ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search epics…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
              </div>
              <div className="relative sm:w-56">
                <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/30" />
                <select
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                >
                  <option value="" className="bg-black">
                    Filter by person…
                  </option>
                  {people.map((name) => (
                    <option key={name} value={name} className="bg-black">
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {selectedPerson && (
              <PersonAssignments
                person={selectedPerson}
                epics={personEpics}
                pbis={personPbis}
                tasks={personTasks}
                pbiIdToEpicId={pbiIdToEpicId}
              />
            )}

            {!selectedPerson && showAddEpic && (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-black/30 p-4 backdrop-blur-sm">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="New epic title…"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <AssigneeMultiSelect users={users} value={newAssignees} onChange={setNewAssignees} />
                <div className="flex items-center gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as BoardStatus)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {BOARD_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-black">
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value as RoadmapTimeframe | "")}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    <option value="" className="bg-black">
                      No timeframe
                    </option>
                    {ROADMAP_TIMEFRAMES.map((t) => (
                      <option key={t} value={t} className="bg-black">
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addEpic}
                    disabled={!newTitle.trim() || isAdding}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add Epic
                  </button>
                </div>
              </div>
            )}

            {!selectedPerson &&
              (epics.length === 0 && !showAddEpic ? (
                <p className="text-sm text-white/40">
                  No epics yet — add one above, or generate one from the{" "}
                  <Link href="/board/requirement" className="text-orange-400 hover:underline">
                    Requirement → Epic
                  </Link>{" "}
                  card.
                </p>
              ) : filteredEpics.length === 0 ? (
                <p className="text-sm text-white/40">No epics match &quot;{search}&quot;.</p>
              ) : (
                filteredEpics.map((epic) => (
                  <Link
                    key={epic.id}
                    href={`/board/epics/${epic.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-medium text-white">{epic.title}</h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[epic.status ?? "Not Started"]}`}
                        >
                          {epic.status ?? "Not Started"}
                        </span>
                        {epic.timeframe && (
                          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
                            {epic.timeframe}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-white/50">{epic.description}</p>
                      <AssigneeBadges names={epic.assignees ?? []} />
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                  </Link>
                ))
              ))}
          </div>
        </div>
      </PageBackground>
  );
}

function PersonAssignments({
  person,
  epics,
  pbis,
  tasks,
  pbiIdToEpicId,
}: {
  person: string;
  epics: Epic[];
  pbis: Pbi[];
  tasks: Task[];
  pbiIdToEpicId: Map<string, string>;
}) {
  const totalCount = epics.length + pbis.length + tasks.length;

  if (totalCount === 0) {
    return <p className="text-sm text-white/40">Nothing assigned to {person} yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {epics.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-white/70">Epics ({epics.length})</h3>
          {epics.map((epic) => (
            <Link
              key={epic.id}
              href={`/board/epics/${epic.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{epic.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[epic.status ?? "Not Started"]}`}
                  >
                    {epic.status ?? "Not Started"}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
            </Link>
          ))}
        </div>
      )}

      {pbis.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-white/70">PBIs ({pbis.length})</h3>
          {pbis.map((pbi) => {
            const epicId = pbiIdToEpicId.get(pbi.id);
            return (
              <Link
                key={pbi.id}
                href={epicId ? `/board/epics/${epicId}/pbis/${pbi.id}` : "#"}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{pbi.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[pbi.status] ?? "bg-white/10 text-white/60"}`}
                    >
                      {pbi.status}
                    </span>
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
                      {pbi.priority}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            );
          })}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-white/70">Tasks ({tasks.length})</h3>
          {tasks.map((task) => {
            const epicId = pbiIdToEpicId.get(task.pbiId);
            return (
              <Link
                key={task.id}
                href={epicId ? `/board/epics/${epicId}/pbis/${task.pbiId}` : "#"}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{task.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[task.status] ?? "bg-white/10 text-white/60"}`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
