import { after } from "next/server";
import { addDoc, collection } from "firebase/firestore";
import { sendAlertEmail } from "@/lib/email";
import { contactSubmissionEmailHtml } from "@/lib/alert-email";
import { getContactAlertRecipients, getContactBotDb } from "@/lib/contact-bot";
import { spamReasons } from "@/lib/spam-check";
import { SUBMISSION_LIMITS } from "@/lib/website-types";

export const runtime = "nodejs";

/**
 * Public endpoint behind the contact form on theerrv.com. Validates the message, drops
 * obvious bot traffic, stores it in /contactSubmissions via a scoped bot account and emails
 * the team. Messages that look like spam are still stored, as status "Spam" with the
 * reasons, but send no email. Env:
 *   CONTACT_BOT_EMAIL / CONTACT_BOT_PASSWORD  — Firebase Auth user whose UID is in /contactBots
 *   CONTACT_ALLOWED_ORIGINS                   — comma-separated, defaults to the two theerrv.com hosts
 *   CONTACT_ALERT_RECIPIENTS                  — comma-separated, falls back to ALERT_EMAIL_RECIPIENTS
 */

const DEFAULT_ALLOWED_ORIGINS = ["https://www.theerrv.com", "https://theerrv.com"];
const MAX_BODY_BYTES = 20_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAllowedOrigins(): string[] {
  const configured = (process.env.CONTACT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && getAllowedOrigins().includes(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// Best-effort, per serverless instance — it slows down a single noisy client, it is not a
// global guarantee. The Firestore rules still cap what any one message can contain.
const recentByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    recentByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  recentByIp.set(ip, recent);
  return false;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

type Field = keyof typeof SUBMISSION_LIMITS;
const REQUIRED: Field[] = ["fullName", "email", "details"];

function readFields(body: Record<string, unknown>): Record<Field, string> | string {
  const fields = {} as Record<Field, string>;
  for (const key of Object.keys(SUBMISSION_LIMITS) as Field[]) {
    const raw = body[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value.length > SUBMISSION_LIMITS[key]) return `${key} is too long`;
    if (REQUIRED.includes(key) && !value) return `${key} is required`;
    fields[key] = value;
  }
  if (!EMAIL_PATTERN.test(fields.email)) return "email is invalid";
  return fields;
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

  if (!origin || !getAllowedOrigins().includes(origin)) {
    return json({ error: "Origin not allowed" }, 403);
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "Message too large" }, 413);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  // Honeypot: a field real visitors never see. Bots that fill it get a normal-looking
  // success so they have no signal to adapt to, and nothing is stored.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true });
  }

  if (isRateLimited(clientIp(req))) {
    return json({ error: "Too many messages — please try again later" }, 429);
  }

  const fields = readFields(body);
  if (typeof fields === "string") {
    return json({ error: fields }, 400);
  }

  try {
    const db = await getContactBotDb();
    if (!db) {
      console.error("Contact form: CONTACT_BOT_EMAIL / CONTACT_BOT_PASSWORD not configured");
      return json({ error: "Contact form is not available right now" }, 500);
    }

    const reasons = spamReasons(fields);
    const ref = await addDoc(collection(db, "contactSubmissions"), {
      ...fields,
      status: reasons.length ? "Spam" : "New",
      spamReasons: reasons,
      assignee: null,
      createdAt: Date.now(),
      updatedAt: null,
      updatedBy: null,
    });

    if (!reasons.length) {
      after(() =>
        sendAlertEmail(
          `\u{1F4E8} New website enquiry from ${fields.fullName}`,
          contactSubmissionEmailHtml({ ...fields, submissionId: ref.id }),
          getContactAlertRecipients(),
        ),
      );
    }

    return json({ ok: true });
  } catch (err) {
    console.error("Contact form submission failed:", err);
    return json({ error: "Could not send your message — please email us instead" }, 500);
  }
}
