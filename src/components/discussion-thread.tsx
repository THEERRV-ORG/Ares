"use client";

import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import type { DiscussionEntry } from "@/lib/board-types";

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DiscussionThread({
  path,
  collapsible = true,
}: {
  path: string;
  /** Set false when a parent already gates this component's visibility (e.g. a task row toggle). */
  collapsible?: boolean;
}) {
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();
  const entries = useDbList<DiscussionEntry>(path, (a, b) => a.createdAt - b.createdAt);
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [open, setOpen] = useState(!collapsible);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  async function post() {
    if (!text.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, path), {
        text: text.trim(),
        authorName: user?.displayName ?? user?.email ?? "Unknown",
        authorEmail: user?.email ?? null,
        createdAt: Date.now(),
        editedAt: null,
      });
      setText("");
    } finally {
      setIsPosting(false);
    }
  }

  function startEdit(entry: DiscussionEntry) {
    setEditingId(entry.id);
    setEditText(entry.text);
  }

  async function saveEdit(entryId: string) {
    if (!editText.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, path, entryId), {
        text: editText.trim(),
        editedAt: Date.now(),
      });
      setEditingId(null);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function removeEntry(entry: DiscussionEntry) {
    const ok = await confirm({
      title: "Delete this log entry?",
      description: "This will be permanently removed from the discussion.",
    });
    if (!ok) return;
    await deleteDoc(doc(db, path, entry.id));
  }

  return (
    <div className="flex flex-col gap-3">
      {dialog}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white/90"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          )}
          <MessageSquare className="h-4 w-4 text-orange-400" />
          Discussion {entries.length > 0 && `(${entries.length})`}
        </button>
      ) : (
        <h3 className="flex items-center gap-2 text-sm font-medium text-white/70">
          <MessageSquare className="h-4 w-4 text-orange-400" />
          Discussion {entries.length > 0 && `(${entries.length})`}
        </h3>
      )}

      {open && (
        <>
          {entries.length > 0 && (
            <div className="flex flex-col gap-2">
              {entries.map((entry) => {
                const isOwn = Boolean(user?.email) && entry.authorEmail === user?.email;
                return (
                  <div key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    {editingId === entry.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                          autoFocus
                          className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(entry.id)}
                            disabled={!editText.trim() || isSavingEdit}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:opacity-40"
                          >
                            {isSavingEdit && <Loader2 className="h-3 w-3 animate-spin" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-white/80">
                            {entry.authorName}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-white/40">
                              {formatTimestamp(entry.createdAt)}
                              {entry.editedAt && " (edited)"}
                            </span>
                            {isOwn && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => startEdit(entry)}
                                  title="Edit"
                                  className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => removeEntry(entry)}
                                  title="Delete"
                                  className="rounded p-1 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap text-white/60">
                          {entry.text}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  post();
                }
              }}
              placeholder="Add a log entry…"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
            />
            <button
              onClick={post}
              disabled={!text.trim() || isPosting}
              title="Post"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPosting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
