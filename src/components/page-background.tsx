"use client";

import { ParticleNetworkBackground } from "@/components/ui/particle-network-background";

export function PageBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full flex-col bg-black pl-16">
      <ParticleNetworkBackground className="z-0" />
      <div className="absolute inset-0 left-16 z-0 bg-black/40" />
      <div className="relative z-10 flex h-full w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
