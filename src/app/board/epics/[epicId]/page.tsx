"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { addDoc, collection, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { ChevronRight, Layers, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { AssigneeMultiSelect, AssigneeSelect } from "@/components/assignee-picker";
import { AssigneeBadges } from "@/components/assignee-badges";
import { DiscussionThread } from "@/components/discussion-thread";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useApprovedUsers, useDbDoc, useDbList } from "@/lib/use-db";
import {
  BOARD_STATUSES,
  BOARD_STATUS_STYLES,
  PBI_PRIORITIES,
  ROADMAP_TIMEFRAMES,
  type BoardStatus,
  type Epic,
  type Pbi,
  type PbiPriority,
  type RoadmapTimeframe,
  type UserProfile,
} from "@/lib/board-types";

export default function EpicDetailPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();

  const epic = useDbDoc<Omit<Epic, "id">>(`epics/${epicId}`);
  const allPbis = useDbList<Pbi>("pbis", (a, b) => b.createdAt - a.createdAt);
  const pbis = allPbis.filter((p) => p.epicId === epicId);
  const users = useApprovedUsers<UserProfile & { id: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<BoardStatus>("Not Started");
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editTimeframe, setEditTimeframe] = useState<RoadmapTimeframe | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddPbi, setShowAddPbi] = useState(false);
  const [newPbiTitle, setNewPbiTitle] = useState("");
  const [newPbiDescription, setNewPbiDescription] = useState("");
  const [newPbiPriority, setNewPbiPriority] = useState<PbiPriority>("Medium");
  const [newPbiStatus, setNewPbiStatus] = useState<BoardStatus>("Not Started");
  const [newPbiAssignee, setNewPbiAssignee] = useState("");
  const [isAddingPbi, setIsAddingPbi] = useState(false);
  const [pbiSearch, setPbiSearch] = useState("");

  const filteredPbis = useMemo(() => {
    const q = pbiSearch.trim().toLowerCase();
    if (!q) return pbis;
    return pbis.filter(
      (pbi) => pbi.title.toLowerCase().includes(q) || pbi.description.toLowerCase().includes(q),
    );
  }, [pbis, pbiSearch]);

  function startEditing() {
    if (!epic) return;
    setEditTitle(epic.title);
    setEditDescription(epic.description);
    setEditStatus(epic.status ?? "Not Started");
    setEditAssignees(epic.assignees ?? []);
    setEditTimeframe(epic.timeframe ?? "");
    setIsEditing(true);
  }

  async function saveEdit() {
    setIsSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "epics", epicId), {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        assignees: editAssignees,
        timeframe: editTimeframe || null,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save epic");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEpic() {
    if (!epic) return;
    const ok = await confirm({
      title: "Delete this epic?",
      description: `"${epic.title}" and all its PBIs and tasks will be permanently deleted.`,
    });
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      const pbiIds = new Set(pbis.map((p) => p.id));
      const batch = writeBatch(db);
      batch.delete(doc(db, "epics", epicId));
      for (const id of pbiIds) batch.delete(doc(db, "pbis", id));

      if (pbiIds.size > 0) {
        const tasksSnap = await getDocs(collection(db, "tasks"));
        for (const taskDoc of tasksSnap.docs) {
          const task = taskDoc.data() as { pbiId: string };
          if (pbiIds.has(task.pbiId)) batch.delete(doc(db, "tasks", taskDoc.id));
        }
      }

      await batch.commit();
      router.push("/board/epics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete epic");
      setIsDeleting(false);
    }
  }

  async function addPbi() {
    if (!newPbiTitle.trim()) return;
    setIsAddingPbi(true);
    setError(null);
    try {
      await addDoc(collection(db, "pbis"), {
        epicId,
        title: newPbiTitle,
        description: newPbiDescription,
        priority: newPbiPriority,
        status: newPbiStatus,
        assignee: newPbiAssignee || null,
        createdBy: user?.email ?? null,
        createdAt: Date.now(),
      });
      setNewPbiTitle("");
      setNewPbiDescription("");
      setNewPbiPriority("Medium");
      setNewPbiStatus("Not Started");
      setNewPbiAssignee("");
      setShowAddPbi(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add PBI");
    } finally {
      setIsAddingPbi(false);
    }
  }

  if (epic === undefined) {
    return (
        <PageBackground>
          <div className="flex flex-1 items-center justify-center text-white/40">Loading…</div>
        </PageBackground>
    );
  }

  if (epic === null) {
    return (
        <PageBackground>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-white/60">This epic doesn&apos;t exist anymore.</p>
            <Link href="/board/epics" className="text-orange-400 hover:underline">
              Back to epics
            </Link>
          </div>
        </PageBackground>
    );
  }

  return (
      <PageBackground>
        {dialog}
        <PageHeader title="Epic" icon={Layers} backHref="/board/epics" />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              {isEditing ? (
                <div className="flex flex-col gap-4">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-lg font-medium text-white focus:border-orange-500/50 focus:outline-none"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as BoardStatus)}
                    className="w-fit rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {BOARD_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-black">
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editTimeframe}
                    onChange={(e) => setEditTimeframe(e.target.value as RoadmapTimeframe | "")}
                    className="w-fit rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
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
                  <AssigneeMultiSelect users={users} value={editAssignees} onChange={setEditAssignees} />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:opacity-40"
                    >
                      {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-semibold text-white">{epic.title}</h1>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[epic.status ?? "Not Started"]}`}
                      >
                        {epic.status ?? "Not Started"}
                      </span>
                      {epic.timeframe && (
                        <span className="mt-2 ml-2 inline-block rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-300">
                          {epic.timeframe}
                        </span>
                      )}
                      <AssigneeBadges names={epic.assignees ?? []} />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={startEditing}
                        title="Edit"
                        className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white/80"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={deleteEpic}
                        disabled={isDeleting}
                        title="Delete"
                        className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-white/60">{epic.description}</p>
                </div>
              )}

              <div className="mt-6 border-t border-white/10 pt-5">
                <DiscussionThread path={`epics/${epicId}/discussions`} />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white/90">
                  PBIs {pbis.length > 0 && `(${pbis.length})`}
                </h2>
                <button
                  onClick={() => setShowAddPbi((v) => !v)}
                  title={showAddPbi ? "Close" : "Add PBI"}
                  className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 hover:text-orange-400"
                >
                  {showAddPbi ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </button>
              </div>

              {pbis.length > 0 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={pbiSearch}
                    onChange={(e) => setPbiSearch(e.target.value)}
                    placeholder="Search PBIs…"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
              )}

              {pbis.length > 0 && filteredPbis.length === 0 && (
                <p className="text-sm text-white/40">No PBIs match &quot;{pbiSearch}&quot;.</p>
              )}

              {filteredPbis.map((pbi) => (
                <Link
                  key={pbi.id}
                  href={`/board/epics/${epicId}/pbis/${pbi.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-white">{pbi.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[pbi.status] ?? "bg-white/10 text-white/60"}`}
                      >
                        {pbi.status}
                      </span>
                      <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
                        {pbi.priority}
                      </span>
                    </div>
                    {pbi.description && (
                      <p className="mt-1 truncate text-sm text-white/50">{pbi.description}</p>
                    )}
                    <AssigneeBadges names={pbi.assignee ? [pbi.assignee] : []} />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                </Link>
              ))}

              {showAddPbi && (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-black/30 p-4 backdrop-blur-sm">
                <input
                  value={newPbiTitle}
                  onChange={(e) => setNewPbiTitle(e.target.value)}
                  placeholder="New PBI title…"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <textarea
                  value={newPbiDescription}
                  onChange={(e) => setNewPbiDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newPbiPriority}
                    onChange={(e) => setNewPbiPriority(e.target.value as PbiPriority)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {PBI_PRIORITIES.map((p) => (
                      <option key={p} value={p} className="bg-black">
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newPbiStatus}
                    onChange={(e) => setNewPbiStatus(e.target.value as BoardStatus)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {BOARD_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-black">
                        {s}
                      </option>
                    ))}
                  </select>
                  <AssigneeSelect users={users} value={newPbiAssignee} onChange={setNewPbiAssignee} />
                  <button
                    onClick={addPbi}
                    disabled={!newPbiTitle.trim() || isAddingPbi}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAddingPbi ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add PBI
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </PageBackground>
  );
}
