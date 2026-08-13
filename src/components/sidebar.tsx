"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, MessageCircle, Kanban, Wallet, ChartColumn, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/board", label: "Board", icon: Kanban },
  { href: "/finance", label: "Finance", icon: Wallet, financeOnly: true },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/products", label: "Products", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasFinanceAccess } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-16 flex-col items-center gap-6 border-r border-white/10 bg-black/20 py-6 backdrop-blur-md">
      <Link
        href="/"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-orange-400 transition-colors hover:bg-white/10"
        title="Ares"
      >
        <Flame className="h-5 w-5" />
      </Link>

      <nav className="flex flex-col items-center gap-2">
        {NAV_ITEMS.filter((item) => !item.financeOnly || hasFinanceAccess).map(
          ({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors",
                active
                  ? "bg-orange-500/15 text-orange-300"
                  : "text-white/50 hover:bg-white/10 hover:text-white/80",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
