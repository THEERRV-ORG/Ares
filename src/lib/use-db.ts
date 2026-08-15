"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useDbList<T extends { id: string }>(
  path: string,
  sortFn?: (a: T, b: T) => number,
): T[] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
      setItems(list);
    });
    return unsubscribe;
  }, [path]);

  return useMemo(() => (sortFn ? [...items].sort(sortFn) : items), [items, sortFn]);
}

/** undefined = still loading, null = does not exist */
export function useDbDoc<T>(path: string): T | null | undefined {
  const [document, setDocument] = useState<T | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, path), (snapshot) => {
      setDocument(snapshot.exists() ? (snapshot.data() as T) : null);
    });
    return unsubscribe;
  }, [path]);

  return document;
}

/**
 * Every account that has ever attempted to sign in gets a `users` doc — even ones never
 * approved. This narrows that list down to only actual approved members (`members/{uid}`
 * exists), so assignee pickers and the like never show unapproved or duplicate accounts.
 */
export function useApprovedUsers<T extends { id: string }>(): T[] {
  const users = useDbList<T>("users");
  const members = useDbList<{ id: string }>("members");

  return useMemo(() => {
    const approvedIds = new Set(members.map((m) => m.id));
    return users.filter((u) => approvedIds.has(u.id));
  }, [users, members]);
}
