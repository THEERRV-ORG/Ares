"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { UserProfile } from "@/lib/board-types";

export function displayNameOf(u: UserProfile & { id: string }) {
  return u.displayName ?? u.email ?? u.id;
}

export function AssigneeSelect({
  users,
  value,
  onChange,
}: {
  users: (UserProfile & { id: string })[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-orange-500/50 focus:outline-none"
    >
      <option value="" className="bg-black">
        Unassigned
      </option>
      {users.map((u) => (
        <option key={u.id} value={displayNameOf(u)} className="bg-black">
          {displayNameOf(u)}
        </option>
      ))}
    </select>
  );
}

export function AssigneeMultiSelect({
  users,
  value,
  onChange,
}: {
  users: (UserProfile & { id: string })[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white focus:border-orange-500/50 focus:outline-none"
      >
        <span className={value.length ? "text-white" : "text-white/40"}>
          {value.length ? value.join(", ") : "Assign people…"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#111] p-1 shadow-2xl">
            {users.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-white/40">No team members yet.</p>
            ) : (
              users.map((u) => {
                const name = displayNameOf(u);
                const checked = value.includes(name);
                return (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(name)}
                      className="accent-orange-500"
                    />
                    {name}
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
