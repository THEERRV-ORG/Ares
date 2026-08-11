"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Loader2, Mail, Pencil, Phone, Trash2, Users, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { AssigneeSelect } from "@/components/assignee-picker";
import { AssigneeBadges } from "@/components/assignee-badges";
import { DiscussionThread } from "@/components/discussion-thread";
import { db } from "@/lib/firebase";
import { useDbDoc, useDbList } from "@/lib/use-db";
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

export default function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  const lead = useDbDoc<Omit<Lead, "id">>(`leads/${leadId}`);
  const users = useDbList<UserProfile & { id: string }>("users");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSource, setEditSource] = useState<LeadSource>("Website");
  const [editStatus, setEditStatus] = useState<LeadStatus>("New");
  const [editValue, setEditValue] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    if (!lead) return;
    setEditName(lead.name);
    setEditCompany(lead.company);
    setEditEmail(lead.email);
    setEditPhone(lead.phone);
    setEditSource(lead.source ?? "Website");
    setEditStatus(lead.status ?? "New");
    setEditValue(lead.value != null ? String(lead.value) : "");
    setEditAssignee(lead.assignee ?? "");
    setEditNotes(lead.notes);
    setIsEditing(true);
  }

  async function saveEdit() {
    setIsSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "leads", leadId), {
        name: editName,
        company: editCompany,
        email: editEmail,
        phone: editPhone,
        source: editSource,
        status: editStatus,
        value: editValue ? Number(editValue) : null,
        assignee: editAssignee || null,
        notes: editNotes,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLead() {
    if (!lead) return;
    const ok = await confirm({
      title: "Delete this lead?",
      description: `"${lead.name}" will be permanently deleted.`,
    });
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "leads", leadId));
      router.push("/board/leads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead");
      setIsDeleting(false);
    }
  }

  if (lead === undefined) {
    return (
      <PageBackground>
        <div className="flex flex-1 items-center justify-center text-white/40">Loading…</div>
      </PageBackground>
    );
  }

  if (lead === null) {
    return (
      <PageBackground>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-white/60">This lead doesn&apos;t exist anymore.</p>
          <Link href="/board/leads" className="text-orange-400 hover:underline">
            Back to leads
          </Link>
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      {dialog}
      <PageHeader title="Lead" icon={Users} backHref="/board/leads" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            {isEditing ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Contact name"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-lg font-medium text-white focus:border-orange-500/50 focus:outline-none"
                  />
                  <input
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="Company"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    type="email"
                    placeholder="Email"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes"
                  rows={3}
                  className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value as LeadSource)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s} className="bg-black">
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
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
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Est. value"
                      className="w-32 rounded-r-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 [appearance:textfield] focus:border-orange-500/50 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
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
                    <h1 className="text-2xl font-semibold text-white">
                      {lead.company || "No company"}
                    </h1>
                    <p className="text-white/50">{lead.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${LEAD_STATUS_STYLES[lead.status ?? "New"]}`}
                      >
                        {lead.status ?? "New"}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                        {lead.source}
                      </span>
                      {lead.value != null && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                          {formatINR(lead.value)}
                        </span>
                      )}
                    </div>
                    <AssigneeBadges names={lead.assignee ? [lead.assignee] : []} />
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
                      onClick={deleteLead}
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

                {(lead.email || lead.phone) && (
                  <div className="flex flex-wrap gap-4 text-sm text-white/60">
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1.5 hover:text-orange-400"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-1.5 hover:text-orange-400"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {lead.phone}
                      </a>
                    )}
                  </div>
                )}

                {lead.notes && <p className="text-white/60">{lead.notes}</p>}
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-5">
              <DiscussionThread path={`leads/${leadId}/discussions`} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </PageBackground>
  );
}
