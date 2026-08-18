"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  Timer,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { NeuralVortexBackground } from "@/components/ui/neural-vortex-background";
import { useDbDoc, useDbList } from "@/lib/use-db";
import type { Product, ProductCheck, ProductCheckStatus } from "@/lib/product-types";
import { ResponseTimeChart } from "./response-time-chart";

const CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;
const CHECK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function formatFullTimestamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatShortTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function domainExpiryStatus(expiryAt: number) {
  const daysLeft = Math.ceil((expiryAt - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) {
    return { label: `Expired ${Math.abs(daysLeft)}d ago`, className: "text-red-400" };
  }
  if (daysLeft <= 30) {
    return { label: `${daysLeft}d left`, className: "text-amber-400" };
  }
  return { label: `${daysLeft}d left`, className: "text-emerald-400" };
}

const STATUS_CONFIG: Record<
  ProductCheckStatus,
  { icon: typeof CheckCircle2; label: string; className: string; badgeClassName: string }
> = {
  up: {
    icon: CheckCircle2,
    label: "Up",
    className: "text-emerald-400",
    badgeClassName: "bg-emerald-500/10 text-emerald-300",
  },
  down: {
    icon: XCircle,
    label: "Down",
    className: "text-red-400",
    badgeClassName: "bg-red-500/10 text-red-300",
  },
  error: {
    icon: AlertTriangle,
    label: "Error",
    className: "text-amber-400",
    badgeClassName: "bg-amber-500/10 text-amber-300",
  },
};

function uptimePercent(checks: ProductCheck[], windowMs: number) {
  const cutoff = Date.now() - windowMs;
  const inWindow = checks.filter((c) => c.checkedAt >= cutoff);
  if (inWindow.length === 0) return null;
  const upCount = inWindow.filter((c) => c.status === "up").length;
  return (upCount / inWindow.length) * 100;
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const product = useDbDoc<Omit<Product, "id">>(`products/${productId}`);
  const checks = useDbList<ProductCheck>(
    `products/${productId}/checks`,
    (a, b) => b.checkedAt - a.checkedAt,
  );

  const uptime24h = useMemo(() => uptimePercent(checks, 24 * 60 * 60 * 1000), [checks]);
  const uptime7d = useMemo(() => uptimePercent(checks, 7 * 24 * 60 * 60 * 1000), [checks]);
  const latest = checks[0];
  const oldest = checks[checks.length - 1];
  const nextCheckAt = product?.lastCheckedAt ? product.lastCheckedAt + CHECK_INTERVAL_MS : null;
  const nextCleanupAt = oldest ? oldest.checkedAt + CHECK_RETENTION_MS : null;

  const chartData = useMemo(
    () =>
      [...checks]
        .filter((c) => c.responseTimeMs != null)
        .reverse()
        .map((c) => ({ label: formatShortTime(c.checkedAt), responseTimeMs: c.responseTimeMs! })),
    [checks],
  );

  if (product === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white/40">
        Loading…
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black text-center">
        <p className="text-white/60">This product doesn&apos;t exist anymore.</p>
        <Link href="/products" className="text-orange-400 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black pl-16">
      <NeuralVortexBackground />
      <div className="absolute inset-0 left-16 z-0 bg-black/60" />

      <div className="relative z-10 flex h-full w-full flex-1 flex-col overflow-hidden">
        <PageHeader title={product.name} icon={Globe} backHref="/products" />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <Eye className="h-4 w-4 text-orange-400" />
                <p className="text-sm text-white/50">
                  Ares is keeping watch over this site — checking in every 3 hours, day and night.
                </p>
              </div>
              {product.description && <p className="mt-1 text-white/70">{product.description}</p>}
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex w-fit items-center gap-1.5 text-sm text-orange-300/80 hover:text-orange-300 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                {product.url}
              </a>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white/70">
                <CalendarClock className="h-4 w-4" />
                Domain
              </h2>
              {product.domainPurchased ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <p className="text-white/70">
                    Purchased{" "}
                    <span className="text-white">
                      {product.domainPurchasedAt ? formatDate(product.domainPurchasedAt) : "—"}
                    </span>
                  </p>
                  <p className="text-white/70">
                    Expires{" "}
                    <span className="text-white">
                      {product.domainExpiryAt ? formatDate(product.domainExpiryAt) : "—"}
                    </span>
                  </p>
                  {product.domainExpiryAt && (
                    <p className={domainExpiryStatus(product.domainExpiryAt).className}>
                      {domainExpiryStatus(product.domainExpiryAt).label}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/40">Domain not purchased by us.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Uptime (24h)" value={uptime24h != null ? `${uptime24h.toFixed(1)}%` : "—"} />
              <StatTile label="Uptime (7d)" value={uptime7d != null ? `${uptime7d.toFixed(1)}%` : "—"} />
              <StatTile
                label="Response time"
                value={latest?.responseTimeMs != null ? `${latest.responseTimeMs}ms` : "—"}
                icon={Timer}
              />
              <StatTile
                label="Next check"
                value={nextCheckAt ? formatFullTimestamp(nextCheckAt) : "—"}
                icon={Clock}
              />
            </div>

            {chartData.length > 1 && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
                <h2 className="mb-3 text-sm font-medium text-white/70">Response time over time</h2>
                <ResponseTimeChart data={chartData} />
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-white/70">
                  Check history {checks.length > 0 && `(${checks.length})`}
                </h2>
                {nextCleanupAt && (
                  <p className="text-xs text-white">
                    Records older than 7 days are auto-cleaned • oldest clears{" "}
                    {formatFullTimestamp(nextCleanupAt)}
                  </p>
                )}
              </div>

              {checks.length === 0 ? (
                <p className="text-sm text-white/40">No checks logged yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {checks.map((check) => {
                    const config = STATUS_CONFIG[check.status];
                    const Icon = config.icon;
                    return (
                      <div
                        key={check.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <span
                          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${config.badgeClassName}`}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <span className="text-sm text-white/70">
                          {formatFullTimestamp(check.checkedAt)}
                        </span>
                        {check.responseTimeMs != null && (
                          <span className="text-xs text-white/40">{check.responseTimeMs}ms</span>
                        )}
                        {check.error && (
                          <span className="min-w-0 flex-1 truncate text-xs text-red-300/80">
                            {check.error}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Timer;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
      <p className="flex items-center gap-1.5 text-xs text-white/40">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
