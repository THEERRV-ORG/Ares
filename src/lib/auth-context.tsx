"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVITY_KEY = "ares_last_activity";
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isMember: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

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
    const memberRef = doc(db, "members", user.uid);
    const unsubscribe = onSnapshot(memberRef, (snapshot) => {
      setIsMember(snapshot.exists());
    });
    return unsubscribe;
  }, [user]);

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
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function signOutUser() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isMember: Boolean(user) && isMember, signInWithGoogle, signOutUser }}
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
