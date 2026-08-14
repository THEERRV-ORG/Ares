"use client";

import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { Loader2, MessagesSquare, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { PixelCanvas } from "@/components/ui/pixel-canvas";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import { RETRO_COLUMNS, type RetroColumnId, type RetroItem } from "@/lib/retro-types";

const COLUMN_PIXEL_COLORS: Record<RetroColumnId, string[]> = {
  went_well: ["#022c22", "#10b981", "#6ee7b7"],
  needs_improvement: ["#451a03", "#f59e0b", "#fcd34d"],
  action_items: ["#082f49", "#0ea5e9", "#7dd3fc"],
};

const COLUMN_STYLES: Record<RetroColumnId, string> = {
  went_well: "border-emerald-500/30",
  needs_improvement: "border-amber-500/30",
  action_items: "border-sky-500/30",
};

export default function RetroPage() {
  const { confirm, dialog } = useConfirmDialog();
  const items = useDbList<RetroItem>("retroItems", (a, b) => a.createdAt - b.createdAt);
  const [drafts, setDrafts] = useState<Record<RetroColumnId, string>>({
    went_well: "",
    needs_improvement: "",
    action_items: "",
  });
  const [postingColumn, setPostingColumn] = useState<RetroColumnId | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function postItem(column: RetroColumnId) {
    const text = drafts[column].trim();
    if (!text || postingColumn) return;
    setPostingColumn(column);
    setError(null);
    try {
      await addDoc(collection(db, "retroItems"), {
        column,
        text,
        createdAt: Date.now(),
      });
      setDrafts((d) => ({ ...d, [column]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPostingColumn(null);
    }
  }

  async function deleteItem(itemId: string) {
    try {
      await deleteDoc(doc(db, "retroItems", itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function clearBoard() {
    const ok = await confirm({
      title: "Clear the whole board?",
      description: "Every card in every column will be permanently deleted — good for starting a fresh retro.",
      confirmLabel: "Clear board",
      typeToConfirm: "CLEAR",
    });
    if (!ok) return;

    setIsClearing(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "retroItems"));
      const batch = writeBatch(db);
      for (const d of snap.docs) batch.delete(d.ref);
      await batch.commit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear board");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <PageBackground>
      {dialog}
      <PageHeader title="Retrospective" icon={MessagesSquare} backHref="/board" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              Entries are anonymous — nobody&apos;s name is stored or shown.
            </p>
            <button
              onClick={clearBoard}
              disabled={isClearing || items.length === 0}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isClearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Clear board
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {RETRO_COLUMNS.map(({ id, label }) => {
              const columnItems = items.filter((i) => i.column === id);
              return (
                <div
                  key={id}
                  className={`flex flex-col gap-3 rounded-2xl border bg-white/5 p-4 backdrop-blur-sm ${COLUMN_STYLES[id]}`}
                >
                  <h2 className="text-sm font-semibold text-white/90">
                    {label} {columnItems.length > 0 && `(${columnItems.length})`}
                  </h2>

                  <div className="flex flex-col gap-2">
                    {columnItems.map((item) => (
                      <div
                        key={item.id}
                        className="group relative flex items-start gap-2 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-3"
                      >
                        <PixelCanvas gap={6} speed={30} colors={COLUMN_PIXEL_COLORS[id]} />
                        <p className="relative z-10 flex-1 text-base font-semibold whitespace-pre-wrap text-white">
                          {item.text}
                        </p>
                        <button
                          onClick={() => deleteItem(item.id)}
                          title="Delete"
                          className="relative z-10 shrink-0 rounded p-1 text-white/30 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2">
                    <textarea
                      value={drafts[id]}
                      onChange={(e) => setDrafts((d) => ({ ...d, [id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          postItem(id);
                        }
                      }}
                      placeholder="Add a card…"
                      rows={2}
                      className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                    />
                    <button
                      onClick={() => postItem(id)}
                      disabled={!drafts[id].trim() || postingColumn === id}
                      title="Add"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {postingColumn === id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
