"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { ChevronDown, ChevronUp, FileText, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { AssigneeSelect } from "@/components/assignee-picker";
import { AssigneeBadges } from "@/components/assignee-badges";
import { DiscussionThread } from "@/components/discussion-thread";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useApprovedUsers, useDbDoc, useDbList } from "@/lib/use-db";
import {
  BOARD_STATUSES,
  BOARD_STATUS_STYLES,
  PBI_PRIORITIES,
  type BoardStatus,
  type Pbi,
  type PbiPriority,
  type Task,
  type UserProfile,
} from "@/lib/board-types";

export default function PbiDetailPage() {
  const { epicId, pbiId } = useParams<{ epicId: string; pbiId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();

  const pbi = useDbDoc<Omit<Pbi, "id">>(`pbis/${pbiId}`);
  const allTasks = useDbList<Task>("tasks", (a, b) => b.createdAt - a.createdAt);
  const tasks = allTasks.filter((t) => t.pbiId === pbiId);
  const users = useApprovedUsers<UserProfile & { id: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<PbiPriority>("Medium");
  const [editStatus, setEditStatus] = useState<BoardStatus>("Not Started");
  const [editAssignee, setEditAssignee] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskEstimate, setNewTaskEstimate] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<BoardStatus>("Not Started");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  function startEditing() {
    if (!pbi) return;
    setEditTitle(pbi.title);
    setEditDescription(pbi.description);
    setEditPriority(pbi.priority);
    setEditStatus(pbi.status ?? "Not Started");
    setEditAssignee(pbi.assignee ?? "");
    setIsEditing(true);
  }

  async function saveEdit() {
    setIsSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "pbis", pbiId), {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        status: editStatus,
        assignee: editAssignee || null,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save PBI");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePbi() {
    if (!pbi) return;
    const ok = await confirm({
      title: "Delete this PBI?",
      description: `"${pbi.title}" and all its tasks will be permanently deleted.`,
    });
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "pbis", pbiId));
      for (const t of tasks) batch.delete(doc(db, "tasks", t.id));
      await batch.commit();
      router.push(`/board/epics/${epicId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete PBI");
      setIsDeleting(false);
    }
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    setError(null);
    try {
      await addDoc(collection(db, "tasks"), {
        pbiId,
        title: newTaskTitle,
        assignee: newTaskAssignee || null,
        estimatedHours: newTaskEstimate ? Number(newTaskEstimate) : null,
        completedHours: null,
        status: newTaskStatus,
        createdBy: user?.email ?? null,
        createdAt: Date.now(),
      });
      setNewTaskTitle("");
      setNewTaskAssignee("");
      setNewTaskEstimate("");
      setNewTaskStatus("Not Started");
      setShowAddTask(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setIsAddingTask(false);
    }
  }

  async function deleteTask(taskId: string, title: string) {
    const ok = await confirm({
      title: "Delete this task?",
      description: `"${title}" will be permanently deleted.`,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function updateTaskField<K extends keyof Task>(taskId: string, field: K, value: Task[K]) {
    try {
      await updateDoc(doc(db, "tasks", taskId), { [field]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  if (pbi === undefined) {
    return (
        <PageBackground>
          <div className="flex flex-1 items-center justify-center text-white/40">Loading…</div>
        </PageBackground>
    );
  }

  if (pbi === null) {
    return (
        <PageBackground>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-white/60">This PBI doesn&apos;t exist anymore.</p>
            <Link href={`/board/epics/${epicId}`} className="text-orange-400 hover:underline">
              Back to epic
            </Link>
          </div>
        </PageBackground>
    );
  }

  return (
      <PageBackground>
        {dialog}
        <PageHeader title="PBI" icon={FileText} backHref={`/board/epics/${epicId}`} />

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
                    rows={3}
                    className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as PbiPriority)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                    >
                      {PBI_PRIORITIES.map((p) => (
                        <option key={p} value={p} className="bg-black">
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as BoardStatus)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                    >
                      {BOARD_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-black">
                          {s}
                        </option>
                      ))}
                    </select>
                    <AssigneeSelect users={users} value={editAssignee} onChange={setEditAssignee} />
                  </div>
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
                      <h1 className="text-2xl font-semibold text-white">{pbi.title}</h1>
                      <div className="mt-2 flex gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[pbi.status] ?? "bg-white/10 text-white/60"}`}
                        >
                          {pbi.status}
                        </span>
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
                          {pbi.priority}
                        </span>
                      </div>
                      <AssigneeBadges names={pbi.assignee ? [pbi.assignee] : []} />
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
                        onClick={deletePbi}
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
                  {pbi.description && <p className="text-white/60">{pbi.description}</p>}
                </div>
              )}

              <div className="mt-6 border-t border-white/10 pt-5">
                <DiscussionThread path={`pbis/${pbiId}/discussions`} />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white/90">
                  Tasks {tasks.length > 0 && `(${tasks.length})`}
                </h2>
                <button
                  onClick={() => setShowAddTask((v) => !v)}
                  title={showAddTask ? "Close" : "Add Task"}
                  className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 hover:text-orange-400"
                >
                  {showAddTask ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </button>
              </div>

              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  {editingTaskId === task.id ? (
                    <TaskEditForm
                      task={task}
                      users={users}
                      onCancel={() => setEditingTaskId(null)}
                      onSave={async (updates) => {
                        for (const [field, value] of Object.entries(updates)) {
                          await updateTaskField(task.id, field as keyof Task, value as never);
                        }
                        setEditingTaskId(null);
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-medium text-white">{task.title}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${BOARD_STATUS_STYLES[task.status] ?? "bg-white/10 text-white/60"}`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <AssigneeBadges names={task.assignee ? [task.assignee] : []} />
                        {(task.estimatedHours != null || task.completedHours != null) && (
                          <p className="mt-1 text-sm text-white/50">
                            {task.estimatedHours != null && `Est ${task.estimatedHours}h`}
                            {task.estimatedHours != null && task.completedHours != null && " · "}
                            {task.completedHours != null && `Done ${task.completedHours}h`}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() =>
                            setExpandedTaskId((v) => (v === task.id ? null : task.id))
                          }
                          title="Discussion"
                          className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white/80"
                        >
                          {expandedTaskId === task.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingTaskId(task.id)}
                          title="Edit"
                          className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white/80"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id, task.title)}
                          title="Delete"
                          className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {expandedTaskId === task.id && editingTaskId !== task.id && (
                    <div className="border-t border-white/10 pt-3">
                      <DiscussionThread path={`tasks/${task.id}/discussions`} collapsible={false} />
                    </div>
                  )}
                </div>
              ))}

              {showAddTask && (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-black/30 p-4 backdrop-blur-sm">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New task title…"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <AssigneeSelect users={users} value={newTaskAssignee} onChange={setNewTaskAssignee} />
                  <input
                    value={newTaskEstimate}
                    onChange={(e) => setNewTaskEstimate(e.target.value)}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Est. hours"
                    className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                  />
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as BoardStatus)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {BOARD_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-black">
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addTask}
                    disabled={!newTaskTitle.trim() || isAddingTask}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAddingTask ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add Task
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

function TaskEditForm({
  task,
  users,
  onSave,
  onCancel,
}: {
  task: Task;
  users: (UserProfile & { id: string })[];
  onSave: (updates: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [status, setStatus] = useState<BoardStatus>(task.status ?? "Not Started");
  const [estimatedHours, setEstimatedHours] = useState(task.estimatedHours?.toString() ?? "");
  const [completedHours, setCompletedHours] = useState(task.completedHours?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await onSave({
      title,
      assignee: assignee || null,
      status,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
      completedHours: completedHours ? Number(completedHours) : null,
    });
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <AssigneeSelect users={users} value={assignee} onChange={setAssignee} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BoardStatus)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
        >
          {BOARD_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-black">
              {s}
            </option>
          ))}
        </select>
        <input
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          type="number"
          min="0"
          step="0.5"
          placeholder="Est. hours"
          className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
        />
        <input
          value={completedHours}
          onChange={(e) => setCompletedHours(e.target.value)}
          type="number"
          min="0"
          step="0.5"
          placeholder="Completed hours"
          className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:opacity-40"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
