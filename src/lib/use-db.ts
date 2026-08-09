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
