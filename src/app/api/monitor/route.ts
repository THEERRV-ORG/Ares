import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDocs, getFirestore, updateDoc } from "firebase/firestore";
import type { ProductCheckStatus } from "@/lib/product-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHECK_TIMEOUT_MS = 10_000;

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

  try {
    await signInWithEmailAndPassword(auth, botEmail, botPassword);

    const productsSnap = await getDocs(collection(db, "products"));

    const results = await Promise.all(
      productsSnap.docs.map(async (productDoc) => {
        const product = productDoc.data() as { name?: string; url?: string };
        if (!product.url) return { id: productDoc.id, name: product.name, skipped: true };

        const result = await checkUrl(product.url);
        const checkedAt = Date.now();

        await addDoc(collection(db, "products", productDoc.id, "checks"), {
          status: result.status,
          statusCode: result.statusCode,
          error: result.error,
          responseTimeMs: result.responseTimeMs,
          checkedAt,
        });

        await updateDoc(doc(db, "products", productDoc.id), {
          lastCheckedAt: checkedAt,
          lastStatus: result.status,
          lastStatusCode: result.statusCode,
          lastError: result.error,
        });

        return { id: productDoc.id, name: product.name, ...result };
      }),
    );

    return Response.json({ checkedAt: Date.now(), count: results.length, results });
  } finally {
    await signOut(auth).catch(() => {});
  }
}
