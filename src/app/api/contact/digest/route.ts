import { collection, getDocs, query, where } from "firebase/firestore";
import { sendAlertEmail } from "@/lib/email";
import { contactDigestEmailHtml } from "@/lib/alert-email";
import { getContactAlertRecipients, getContactBotDb } from "@/lib/contact-bot";
import type { ContactSubmission } from "@/lib/website-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 30;
/** Open messages older than this with no reply are called out as waiting. */
const WAITING_AFTER_DAYS = 2;

/**
 * Weekly inbox summary, called every Monday by .github/workflows/contact-digest.yml with
 * the x-digest-secret header (CONTACT_DIGEST_SECRET). Emails last week's numbers and every
 * message still waiting on a reply to the contact alert recipients.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-digest-secret");
  if (!secret || secret !== process.env.CONTACT_DIGEST_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getContactBotDb();
  if (!db) {
    return Response.json({ error: "Contact bot credentials not configured" }, { status: 500 });
  }

  const now = Date.now();
  const snap = await getDocs(
    query(collection(db, "contactSubmissions"), where("createdAt", ">=", now - LOOKBACK_DAYS * DAY_MS)),
  );
  const recent = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContactSubmission);

  const lastWeek = recent.filter((s) => s.createdAt >= now - 7 * DAY_MS);
  const genuine = lastWeek.filter((s) => s.status !== "Spam");
  const byService = new Map<string, number>();
  for (const s of genuine) {
    const key = s.service || "Not specified";
    byService.set(key, (byService.get(key) ?? 0) + 1);
  }
  const waiting = recent
    .filter(
      (s) => (s.status === "New" || s.status === "Read") && s.createdAt <= now - WAITING_AFTER_DAYS * DAY_MS,
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  const recipients = getContactAlertRecipients();
  await sendAlertEmail(
    `\u{1F4CA} Website inbox: ${genuine.length} new ${genuine.length === 1 ? "enquiry" : "enquiries"} this week`,
    contactDigestEmailHtml({
      received: genuine.length,
      replied: genuine.filter((s) => s.status === "Replied" || s.status === "Closed").length,
      spam: lastWeek.length - genuine.length,
      byService: [...byService.entries()].sort((a, b) => b[1] - a[1]),
      waiting: waiting.map((s) => ({
        id: s.id,
        name: s.fullName,
        company: s.company,
        service: s.service,
        daysOld: Math.floor((now - s.createdAt) / DAY_MS),
      })),
    }),
    recipients,
  );

  return Response.json({ sent: recipients.length > 0, received: genuine.length, waiting: waiting.length });
}
