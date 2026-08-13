"use client";

import Image from "next/image";
import { Flame, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ParticleNetworkBackground } from "@/components/ui/particle-network-background";
import { RainbowButton } from "@/components/ui/rainbow-button";
import theerrvLogo from "@/assets/Theerrvlogo.png";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A11.998 11.998 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <ParticleNetworkBackground className="z-0" />
      <div className="absolute inset-0 z-0 bg-black/50" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-white/10 bg-black/60 p-8 text-center shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

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
      <AuthScreen>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
            <Flame className="h-7 w-7" />
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
            <Image
              src={theerrvLogo}
              alt="Theerrv Technologies"
              className="h-full w-full object-contain"
            />
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Ares</h1>
          <p className="text-xs text-white/40">Powered by Theerrv Technologies</p>
        </div>
        <p className="text-sm text-white/40">
          Ares, your AI-powered personal assistant — sign in with your company Google account to
          get started.
        </p>
        <RainbowButton onClick={signInWithGoogle} className="w-full gap-2.5">
          <GoogleIcon />
          Sign in with Google
        </RainbowButton>
      </AuthScreen>
    );
  }

  if (!isMember) {
    return (
      <AuthScreen>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Waiting for access</h1>
          <p className="mt-2 text-sm text-white/50">
            Signed in as <span className="text-white/80">{user.email}</span>, but you&apos;re not
            on the team list yet.
          </p>
        </div>
        <p className="text-sm text-white/40">
          Ask an admin to approve this account, then refresh this page.
        </p>
        <button
          onClick={signOutUser}
          className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white/80"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </AuthScreen>
    );
  }

  return <>{children}</>;
}
