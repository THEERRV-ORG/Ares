"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVITY_KEY = "ares_last_activity";
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isMember: boolean;
  hasFinanceAccess: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Tagged with the uid it was fetched for, so a stale result from a previous account
  // can never be mistaken for the current one while a fresh check is still in flight.
  const [memberStatus, setMemberStatus] = useState<{
    uid: string;
    isMember: boolean;
    hasFinanceAccess: boolean;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        setDoc(
          doc(db, "users", firebaseUser.uid),
          {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            lastSeen: Date.now(),
          },
          { merge: true },
        );
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const memberRef = doc(db, "members", uid);
    const unsubscribe = onSnapshot(
      memberRef,
      (snapshot) => {
        setMemberStatus({
          uid,
          isMember: snapshot.exists(),
          hasFinanceAccess: snapshot.data()?.financeAccess === true,
        });
      },
      () => {
        // Permission denied (not a member) or any other read failure — treat as not a member.
        setMemberStatus({ uid, isMember: false, hasFinanceAccess: false });
      },
    );
    return unsubscribe;
  }, [user]);

  // Only trust memberStatus when it was fetched for the currently signed-in account —
  // this is what stops a previous account's approval from leaking into a fresh sign-in
  // while the new account's check is still in flight.
  const isMember = Boolean(user) && memberStatus?.uid === user?.uid && (memberStatus?.isMember ?? false);
  const hasFinanceAccess =
    Boolean(user) && memberStatus?.uid === user?.uid && (memberStatus?.hasFinanceAccess ?? false);

  // Auto sign-out after a period of inactivity, so a signed-in session doesn't stay
  // open forever on a shared or unattended machine.
  useEffect(() => {
    if (!user) return;

    function markActive() {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    function checkInactivity() {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now());
      if (Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
        firebaseSignOut(auth);
      }
    }

    markActive();
    checkInactivity();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }
    const interval = setInterval(checkInactivity, 60 * 1000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
      clearInterval(interval);
    };
  }, [user]);

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const signedInUser = result.user;
    await addDoc(collection(db, "loginLogs"), {
      uid: signedInUser.uid,
      email: signedInUser.email,
      displayName: signedInUser.displayName,
      photoURL: signedInUser.photoURL,
      userAgent: navigator.userAgent,
      signedInAt: Date.now(),
    });
  }

  async function signOutUser() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isMember,
        hasFinanceAccess,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
