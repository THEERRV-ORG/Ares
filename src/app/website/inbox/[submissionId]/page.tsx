"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Inbox, Loader2, Mail, MessageCircle, Phone, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { RequireWebsiteAccess } from "@/components/require-website-access";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { AssigneeSelect } from "@/components/assignee-picker";
import { DiscussionThread } from "@/components/discussion-thread";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useApprovedUsers, useDbDoc } from "@/lib/use-db";
import type { UserProfile } from "@/lib/board-types";
import {
  REPLY_TEMPLATES,
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_STYLES,
  fillTemplate,
  type ContactSubmission,
  type SubmissionStatus,
} from "@/lib/website-types";

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Bare 10-digit numbers are assumed to be Indian mobiles.
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function SubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();

  const submission = useDbDoc<Omit<ContactSubmission, "id">>(`contactSubmissions/${submissionId}`);
  const users = useApprovedUsers<UserProfile & { id: string }>();

  const [isDeleting, setIsDeleting] = useState(false);
  const [templateId, setTemplateId] = useState<string>(REPLY_TEMPLATES[0].id);
  const [error, setError] = useState<string | null>(null);
  const markedRead = useRef(false);

  async function update(fields: Partial<Pick<ContactSubmission, "status" | "assignee">>) {
    setError(null);
    try {
      await updateDoc(doc(db, "contactSubmissions", submissionId), {
        ...fields,
        updatedAt: Date.now(),
        updatedBy: user?.email ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message");
    }
  }

  // Opening a new message counts as reading it — once, so choosing "New" again sticks.
  useEffect(() => {
    if (submission?.status === "New" && !markedRead.current) {
      markedRead.current = true;
      updateDoc(doc(db, "contactSubmissions", submissionId), {
        status: "Read",
        updatedAt: Date.now(),
        updatedBy: user?.email ?? null,
      }).catch(() => {});
    }
  }, [submission?.status, submissionId, user?.email]);

  async function deleteSubmission() {
    if (!submission) return;
    const ok = await confirm({
      title: "Delete this message?",
      description: `The message from "${submission.fullName}" will be permanently deleted.`,
    });
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "contactSubmissions", submissionId));
      router.push("/website/inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete message");
      setIsDeleting(false);
    }
  }

  if (submission === undefined) {
    return (
      <PageBackground>
        <div className="flex flex-1 items-center justify-center text-white/40">Loading…</div>
      </PageBackground>
    );
  }

  if (submission === null) {
    return (
      <PageBackground>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-white/60">This message doesn&apos;t exist anymore.</p>
          <Link href="/website/inbox" className="text-orange-400 hover:underline">
            Back to inbox
          </Link>
        </div>
      </PageBackground>
    );
  }

  const template = REPLY_TEMPLATES.find((t) => t.id === templateId) ?? REPLY_TEMPLATES[0];
  const replySubject = encodeURIComponent(template.subject);
  const replyBody = encodeURIComponent(fillTemplate(template.body, submission));
  const flagged = submission.status === "Spam" && (submission.spamReasons?.length ?? 0) > 0;

  return (
    <PageBackground>
      {dialog}
      <PageHeader title="Message" icon={Inbox} backHref="/website/inbox" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-white">{submission.fullName}</h1>
                  {submission.company && <p className="text-white/50">{submission.company}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${SUBMISSION_STATUS_STYLES[submission.status]}`}
                    >
                      {submission.status}
                    </span>
                    {submission.service && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                        {submission.service}
                      </span>
                    )}
                    <span className="text-xs text-white/40">
                      {new Date(submission.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={deleteSubmission}
                  disabled={isDeleting}
                  title="Delete"
                  className="shrink-0 rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-white/60">
                <a
                  href={`mailto:${submission.email}`}
                  className="flex items-center gap-1.5 hover:text-orange-400"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {submission.email}
                </a>
                {submission.phone && (
                  <a href={`tel:${submission.phone}`} className="flex items-center gap-1.5 hover:text-orange-400">
                    <Phone className="h-3.5 w-3.5" />
                    {submission.phone}
                  </a>
                )}
              </div>

              {flagged && (
                <div className="flex flex-wrap items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-red-200">Automatically marked as spam</p>
                    <ul className="mt-1 list-inside list-disc text-red-200/70">
                      {submission.spamReasons!.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-red-200/50">No alert email was sent for this message.</p>
                  </div>
                  <button
                    onClick={() => update({ status: "Read" })}
                    className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                  >
                    Not spam
                  </button>
                </div>
              )}

              <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-white/80">
                {submission.details}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={submission.status}
                  onChange={(e) => update({ status: e.target.value as SubmissionStatus })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                >
                  {SUBMISSION_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-black">
                      {s}
                    </option>
                  ))}
                </select>
                <AssigneeSelect
                  users={users}
                  value={submission.assignee ?? ""}
                  onChange={(v) => update({ assignee: v || null })}
                />
                <div className="ml-auto flex flex-wrap gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    title="Reply template"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
                  >
                    {REPLY_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id} className="bg-black">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <a
                    href={`mailto:${submission.email}?subject=${replySubject}&body=${replyBody}`}
                    onClick={() => submission.status !== "Replied" && update({ status: "Replied" })}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Reply by email
                  </a>
                  {submission.phone && (
                    <a
                      href={whatsappLink(submission.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
              {submission.updatedBy && submission.updatedAt && (
                <p className="text-xs text-white/30">
                  Last updated by {submission.updatedBy} ·{" "}
                  {new Date(submission.updatedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <DiscussionThread path={`contactSubmissions/${submissionId}/discussions`} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </PageBackground>
  );
}

export default function SubmissionPage() {
  return (
    <RequireWebsiteAccess>
      <SubmissionDetail />
    </RequireWebsiteAccess>
  );
}
