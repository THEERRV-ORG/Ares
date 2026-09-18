import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import type { ProductCheckStatus } from "@/lib/product-types";
import { sendAlertEmail } from "@/lib/email";
import { downAlertEmailHtml, domainExpiryEmailHtml } from "@/lib/alert-email";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHECK_TIMEOUT_MS = 10_000;
const CHECK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DOMAIN_WARNING_DAYS = 10;

// Isolated secondary app instance for the monitor bot, so this signed-in session never
// mixes with the shared app used elsewhere. Same public Firebase config as the main app —
// the bot's actual access is scoped entirely by Firestore security rules, not by this config.
function getMonitorFirebase() {
  const name = "monitor-bot";
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().find((a) => a.name === name) ?? initializeApp(firebaseConfig, name);
  return { auth: getAuth(app), db: getFirestore(app) };
}

interface CheckResult {
  status: ProductCheckStatus;
  statusCode: number | null;
  error: string | null;
  responseTimeMs: number;
}

async function checkUrl(url: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: { "User-Agent": "Ares-Uptime-Monitor/1.0" },
    });
    const responseTimeMs = Date.now() - start;
    return {
      status: res.ok ? "up" : "down",
      statusCode: res.status,
      error: res.ok ? null : `HTTP ${res.status} ${res.statusText}`,
      responseTimeMs,
    };
  } catch (err) {
    return {
      status: "error",
      statusCode: null,
      error: err instanceof Error ? err.message : "Unknown error",
      responseTimeMs: Date.now() - start,
    };
  }
}

// Fixed, human-configured list — the bot never looks up who members are, it only ever
// emails whoever is explicitly listed here. Keeps the bot fully blind to people/member data.
function getAlertRecipients(): string[] {
  return (process.env.ALERT_EMAIL_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-monitor-secret");
  if (!secret || secret !== process.env.MONITOR_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botEmail = process.env.MONITOR_BOT_EMAIL;
  const botPassword = process.env.MONITOR_BOT_PASSWORD;
  if (!botEmail || !botPassword) {
    return Response.json({ error: "Monitor bot credentials not configured" }, { status: 500 });
  }

  const { auth, db } = getMonitorFirebase();
  const alertRecipients = getAlertRecipients();
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    await signInWithEmailAndPassword(auth, botEmail, botPassword);

    const productsSnap = await getDocs(collection(db, "products"));

    const results = await Promise.all(
      productsSnap.docs.map(async (productDoc) => {
        const product = productDoc.data() as {
          name?: string;
          url?: string;
          lastStatus?: ProductCheckStatus | null;
          domainPurchased?: boolean;
          domainExpiryAt?: number | null;
          domainExpiryAlertedDate?: string | null;
        };
        if (!product.url) return { id: productDoc.id, name: product.name, skipped: true };

        const result = await checkUrl(product.url);
        const checkedAt = Date.now();

        // Alert exactly on the transition into failure, not on every recheck while still
        // down — compares against the status from before this run overwrites it below.
        const wasUp = product.lastStatus == null || product.lastStatus === "up";
        const emailSent = wasUp && result.status !== "up";
        if (emailSent) {
          sendAlertEmail(
            `\u{1F534} ${product.name ?? "A product"} is ${result.status === "down" ? "down" : "erroring"}`,
            downAlertEmailHtml({
              productName: product.name ?? "A product",
              url: product.url,
              status: result.status === "error" ? "error" : "down",
              error: result.error,
              productId: productDoc.id,
            }),
            alertRecipients,
          ).catch(() => {});
        }

        await addDoc(collection(db, "products", productDoc.id, "checks"), {
          status: result.status,
          statusCode: result.statusCode,
          error: result.error,
          responseTimeMs: result.responseTimeMs,
          checkedAt,
          emailSent,
        });

        // Domain-expiry reminder: fires once per calendar day (not every 3-hour run),
        // starting 10 days out, and keeps firing daily — including after actual expiry —
        // until the expiry date is renewed to something further out than the warning window.
        let domainExpiryAlertedDate = product.domainExpiryAlertedDate ?? null;
        if (product.domainPurchased && product.domainExpiryAt) {
          const daysLeft = Math.ceil((product.domainExpiryAt - checkedAt) / (24 * 60 * 60 * 1000));
          const alreadySentToday = product.domainExpiryAlertedDate === todayStr;
          if (daysLeft <= DOMAIN_WARNING_DAYS && !alreadySentToday) {
            sendAlertEmail(
              `\u{1F310} ${product.name ?? "A domain"}'s domain ${daysLeft < 0 ? "has expired" : "expires soon"}`,
              domainExpiryEmailHtml({
                productName: product.name ?? "A product",
                domain: product.url,
                daysLeft,
                productId: productDoc.id,
              }),
              alertRecipients,
            ).catch(() => {});
            domainExpiryAlertedDate = todayStr;
          }
        }

        await updateDoc(doc(db, "products", productDoc.id), {
          lastCheckedAt: checkedAt,
          lastStatus: result.status,
          lastStatusCode: result.statusCode,
          lastError: result.error,
          ...(domainExpiryAlertedDate !== (product.domainExpiryAlertedDate ?? null)
            ? { domainExpiryAlertedDate }
            : {}),
        });

        // Cleanup is best-effort housekeeping — a failure here must never take down the
        // actual up/down check for this product.
        try {
          const staleChecksSnap = await getDocs(
            query(
              collection(db, "products", productDoc.id, "checks"),
              where("checkedAt", "<", checkedAt - CHECK_RETENTION_MS),
            ),
          );
          await Promise.all(staleChecksSnap.docs.map((staleDoc) => deleteDoc(staleDoc.ref)));
        } catch (cleanupErr) {
          console.error(`Cleanup failed for product ${productDoc.id}:`, cleanupErr);
        }

        return { id: productDoc.id, name: product.name, ...result };
      }),
    );

    return Response.json({ checkedAt: Date.now(), count: results.length, results });
  } finally {
    await signOut(auth).catch(() => {});
  }
}
