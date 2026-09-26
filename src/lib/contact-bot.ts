import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Signed-in Firestore handle for the contact bot (UID listed in /contactBots). Same
 * isolated-app pattern as the monitor bot. The bot stays signed in for the life of the
 * serverless instance rather than signing out per request, since concurrent requests on
 * one instance share this auth session. Returns null when the credentials aren't set.
 */
export async function getContactBotDb() {
  const botEmail = process.env.CONTACT_BOT_EMAIL;
  const botPassword = process.env.CONTACT_BOT_PASSWORD;
  if (!botEmail || !botPassword) return null;

  const name = "contact-bot";
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().find((a) => a.name === name) ?? initializeApp(firebaseConfig, name);
  const auth = getAuth(app);
  if (auth.currentUser?.email !== botEmail) {
    await signInWithEmailAndPassword(auth, botEmail, botPassword);
  }
  return getFirestore(app);
}

export function getContactAlertRecipients(): string[] {
  return (process.env.CONTACT_ALERT_RECIPIENTS || process.env.ALERT_EMAIL_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
