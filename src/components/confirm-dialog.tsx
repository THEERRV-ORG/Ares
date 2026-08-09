"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  /** If set, the confirm button stays disabled until the user types this text exactly. */
  typeToConfirm?: string;
}

export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setTypedValue("");
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handle(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }

  const canConfirm = !options?.typeToConfirm || typedValue === options.typeToConfirm;

  const dialog: ReactNode = options ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-white">{options.title}</h2>
            <p className="mt-1 text-sm text-white/50">{options.description}</p>
            {options.typeToConfirm && (
              <input
                autoFocus
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canConfirm) handle(true);
                }}
                placeholder={`Type ${options.typeToConfirm} to confirm`}
                className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
              />
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => handle(false)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => handle(true)}
            disabled={!canConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {options.confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
