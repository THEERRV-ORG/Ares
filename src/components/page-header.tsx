"use client";

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  icon: LucideIcon;
  backHref?: string;
}

export function PageHeader({ title, icon: Icon, backHref }: PageHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-6">
      {backHref && (
        <Link
          href={backHref}
          className="mr-1 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
      <Icon className="h-5 w-5 text-orange-400" />
      <span className="text-base font-medium text-white/90">{title}</span>
    </header>
  );
}
