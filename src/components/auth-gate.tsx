"use client";

import { Flame, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isMember, signInWithGoogle, signOutUser } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white/50">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
          <Flame className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Sign in to Ares</h1>
        <p className="max-w-sm text-white/50">
          Sign in with Google to continue. You&apos;ll stay signed in after this.
        </p>
        <button
          onClick={signInWithGoogle}
          className="rounded-lg bg-orange-500 px-5 py-2.5 font-medium text-white transition-colors hover:bg-orange-400"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black text-center">
        <h1 className="text-2xl font-semibold text-white">Waiting for access</h1>
        <p className="max-w-sm text-white/50">
          Signed in as <span className="text-white/80">{user.email}</span>, but you&apos;re not
          on the team list yet. Ask the admin to approve this account.
        </p>
        <button
          onClick={signOutUser}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
