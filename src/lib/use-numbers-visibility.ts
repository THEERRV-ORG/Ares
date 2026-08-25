"use client";

import { useState } from "react";

const STORAGE_KEY = "ares_finance_numbers_visible";

/**
 * Shared "reveal numbers" toggle for Finance pages. Hidden by default every new browser
 * session (privacy-first), but stays revealed while navigating between Finance pages in
 * the same tab, via sessionStorage. These pages only ever mount client-side (behind the
 * auth gate), so reading sessionStorage in the initializer carries no hydration-mismatch risk.
 */
export function useNumbersVisibility() {
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "true",
  );

  function toggle() {
    setVisible((v) => {
      const next = !v;
      sessionStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return { visible, toggle };
}
