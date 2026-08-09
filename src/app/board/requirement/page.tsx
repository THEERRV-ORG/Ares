"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { Loader2, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import type { Epic } from "@/lib/board-types";

interface EpicDraft {
  title: string;
  description: string;
}

export default function RequirementPage() {
  const { user } = useAuth();
  const [requirement, setRequirement] = useState("");
  const [draft, setDraft] = useState<EpicDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [epics, setEpics] = useState<Epic[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "epics"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Epic);
      list.sort((a, b) => b.createdAt - a.createdAt);
      setEpics(list);
    });
    return unsubscribe;
  }, []);

  async function generate() {
    if (!requirement.trim() || isGenerating) return;
    setError(null);
    setSaved(false);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/epics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate epic");
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  async function approveAndSave() {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "epics"), {
        title: draft.title,
        description: draft.description,
        sourceRequirement: requirement,
        status: "Approved",
        createdBy: user?.email ?? null,
        createdAt: Date.now(),
      });
      setDraft(null);
      setRequirement("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save epic");
    } finally {
      setIsSaving(false);
    }
  }

  return (
      <PageBackground>
        <PageHeader title="Requirement → Epic" icon={Sparkles} backHref="/board" />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white/70">Requirement</label>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                rows={6}
                placeholder="Paste requirement sentences, bullet points, or a rough description…"
                className="resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-base text-white backdrop-blur-sm placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
              />
              <button
                onClick={generate}
                disabled={!requirement.trim() || isGenerating}
                className="flex w-fit items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isGenerating ? "Generating…" : "Generate Epic"}
              </button>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {saved && !draft && (
              <p className="text-sm text-emerald-400">Epic saved to the board.</p>
            )}

            {draft && (
              <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6 backdrop-blur-sm">
                <p className="text-xs font-medium tracking-wide text-orange-400/80 uppercase">
                  Draft epic — review before approving
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white/70">Title</label>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white/70">Description</label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={4}
                    className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={approveAndSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Approve &amp; Save
                  </button>
                  <button
                    onClick={generate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => setDraft(null)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-white/50 transition-colors hover:text-white/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Discard
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-white/70">
                Approved epics {epics.length > 0 && `(${epics.length})`}
              </h2>
              {epics.length === 0 ? (
                <p className="text-sm text-white/40">No epics yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {epics.map((epic) => (
                    <div
                      key={epic.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                    >
                      <h3 className="font-medium text-white">{epic.title}</h3>
                      <p className="mt-1 text-sm text-white/50">{epic.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBackground>
  );
}
