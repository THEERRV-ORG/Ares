"use client";

import { useState } from "react";
import Link from "next/link";
import { addDoc, collection } from "firebase/firestore";
import { Users, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { AssigneeSelect } from "@/components/assignee-picker";
import { AssigneeBadges } from "@/components/assignee-badges";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import { formatINR } from "@/lib/format";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_STYLES,
  type Lead,
  type LeadSource,
  type LeadStatus,
  type UserProfile,
} from "@/lib/board-types";

export default function LeadsPage() {
  const { user } = useAuth();
  const leads = useDbList<Lead>("leads", (a, b) => b.createdAt - a.createdAt);
  const users = useDbList<UserProfile & { id: string }>("users");

  const [showAddLead, setShowAddLead] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSource, setNewSource] = useState<LeadSource>("Website");
  const [newStatus, setNewStatus] = useState<LeadStatus>("New");
  const [newValue, setNewValue] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addLead() {
    if (!newName.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      await addDoc(collection(db, "leads"), {
        name: newName,
        company: newCompany,
        email: newEmail,
        phone: newPhone,
        source: newSource,
        status: newStatus,
        value: newValue ? Number(newValue) : null,
        notes: newNotes,
        assignee: newAssignee || null,
        createdBy: user?.email ?? null,
        createdAt: Date.now(),
      });
      setNewName("");
      setNewCompany("");
      setNewEmail("");
      setNewPhone("");
      setNewSource("Website");
      setNewStatus("New");
      setNewValue("");
      setNewAssignee("");
      setNewNotes("");
      setShowAddLead(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <PageBackground>
      <PageHeader title="Track Leads" icon={Users} backHref="/board" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white/90">
              Leads {leads.length > 0 && `(${leads.length})`}
            </h2>
            <button
              onClick={() => setShowAddLead((v) => !v)}
              title={showAddLead ? "Close" : "Add Lead"}
              className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 hover:text-orange-400"
            >
              {showAddLead ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {showAddLead && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-black/30 p-4 backdrop-blur-sm">
              <div className="flex flex-wrap gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contact name…"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Company (optional)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  type="email"
                  placeholder="Email (optional)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                />
              </div>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as LeadSource)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white/50">
                    ₹
                  </span>
                  <input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="Est. value"
                    className="w-32 rounded-r-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 [appearance:textfield] focus:border-orange-500/50 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <AssigneeSelect users={users} value={newAssignee} onChange={setNewAssignee} />
                <button
                  onClick={addLead}
                  disabled={!newName.trim() || isAdding}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isAdding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add Lead
                </button>
              </div>
            </div>
          )}

          {leads.length === 0 && !showAddLead ? (
            <p className="text-sm text-white/40">No leads yet — add one above to start tracking.</p>
          ) : (
            leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/board/leads/${lead.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-medium text-white">
                      {lead.company || "No company"}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${LEAD_STATUS_STYLES[lead.status ?? "New"]}`}
                    >
                      {lead.status ?? "New"}
                    </span>
                    {lead.value != null && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                        {formatINR(lead.value)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-white/50">
                    {lead.name} · {lead.source}
                  </p>
                  <AssigneeBadges names={lead.assignee ? [lead.assignee] : []} />
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
