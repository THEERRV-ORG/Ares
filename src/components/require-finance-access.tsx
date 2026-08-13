"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageBackground } from "@/components/page-background";

export function RequireFinanceAccess({ children }: { children: React.ReactNode }) {
  const { hasFinanceAccess } = useAuth();

  if (!hasFinanceAccess) {
    return (
      <PageBackground>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-white">Restricted</h1>
          <p className="max-w-sm text-white/50">
            This section is only available to team members with finance access. Ask an admin if
            you need to be added.
          </p>
        </div>
      </PageBackground>
    );
  }

  return <>{children}</>;
}
