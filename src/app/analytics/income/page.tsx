"use client";

import { useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Loader2, PartyPopper, Save, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { RequireFinanceAccess } from "@/components/require-finance-access";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useDbDoc, useDbList } from "@/lib/use-db";
import { formatINR } from "@/lib/format";
import type { FinanceMonth } from "@/lib/finance-types";
import { IncomeByMonthChart } from "./income-chart";

const FY_MONTH_NAMES = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/** Indian financial year: April of `fyStartYear` through March of `fyStartYear + 1`. */
function fyMonthKeys(fyStartYear: number) {
  return FY_MONTH_NAMES.map((name, i) => {
    const monthIndex1 = ((3 + i) % 12) + 1; // Apr=4 ... Mar=3
    const calYear = i < 9 ? fyStartYear : fyStartYear + 1;
    return { name, key: `${calYear}-${String(monthIndex1).padStart(2, "0")}` };
  });
}

function currentFYStartYear(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-indexed; April = 3
  return m >= 3 ? y : y - 1;
}

function fyLabel(fyStartYear: number) {
  return `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
}

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface IncomeTarget {
  amount: number;
  updatedBy: string | null;
  updatedAt: number;
}

export default function IncomeAnalyticsPage() {
  const { user } = useAuth();
  const [fyStartYear, setFyStartYear] = useState(currentFYStartYear());
  const [error, setError] = useState<string | null>(null);

  const allMonths = useDbList<FinanceMonth>("financeMonths");
  const targetDoc = useDbDoc<IncomeTarget>(`incomeTargets/fy-${fyStartYear}`);
  const targetAmount = targetDoc?.amount ?? 0;

  const chartData = useMemo(() => {
    return fyMonthKeys(fyStartYear).map(({ name, key }) => {
      const month = allMonths.find((m) => m.id === key);
      return { month: name, key, income: month?.income ?? 0 };
    });
  }, [allMonths, fyStartYear]);

  const yearTotal = chartData.reduce((sum, m) => sum + m.income, 0);
  const nowKey = currentMonthKey();
  const monthsRemaining = chartData.filter((m) => m.key >= nowKey).length;
  const remaining = Math.max(targetAmount - yearTotal, 0);
  const neededPerMonth = monthsRemaining > 0 ? remaining / monthsRemaining : 0;
  const achieved = targetAmount > 0 && yearTotal >= targetAmount;
  const fyOver = monthsRemaining === 0 && !achieved;

  async function saveTarget(value: number) {
    try {
      await setDoc(
        doc(db, "incomeTargets", `fy-${fyStartYear}`),
        {
          amount: value,
          updatedBy: user?.email ?? null,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save target");
    }
  }

  return (
    <RequireFinanceAccess>
      <PageBackground>
        <PageHeader title="Income Analytics" icon={TrendingUp} backHref="/analytics" />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-medium text-white/70">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    Income by month
                  </h2>
                  <p className="mt-1 text-lg font-semibold text-white">{formatINR(yearTotal)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFyStartYear((y) => y - 1)}
                    title="Previous financial year"
                    className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="w-20 text-center text-sm text-white/70">{fyLabel(fyStartYear)}</span>
                  <button
                    onClick={() => setFyStartYear((y) => y + 1)}
                    title="Next financial year"
                    className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <IncomeByMonthChart
                data={chartData}
                year={fyLabel(fyStartYear)}
                targetPerMonth={!achieved && !fyOver ? neededPerMonth : undefined}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h2 className="flex items-center gap-2 text-sm font-medium text-white/70">
                <Target className="h-4 w-4 text-orange-400" />
                Target for {fyLabel(fyStartYear)}
              </h2>

              <TargetInput key={fyStartYear} value={targetAmount} onCommit={saveTarget} />

              {targetAmount > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <TargetStat label="Target" value={formatINR(targetAmount)} />
                  <TargetStat label="Earned" value={formatINR(yearTotal)} />
                  {achieved ? (
                    <div className="col-span-2 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-300 sm:col-span-2">
                      <PartyPopper className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">Target achieved!</span>
                    </div>
                  ) : fyOver ? (
                    <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 sm:col-span-2">
                      This financial year has ended.
                    </div>
                  ) : (
                    <>
                      <TargetStat label="Remaining" value={formatINR(remaining)} />
                      <TargetStat
                        label={`Needed / month (${monthsRemaining} left)`}
                        value={formatINR(neededPerMonth)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBackground>
    </RequireFinanceAccess>
  );
}

function TargetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function TargetInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (n: number) => Promise<void> | void;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  const [isSaving, setIsSaving] = useState(false);
  const dirty = (text ? Number(text) : 0) !== value;

  async function handleSave() {
    if (!dirty || isSaving) return;
    setIsSaving(true);
    try {
      await onCommit(text ? Number(text) : 0);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        <span className="rounded-l-lg border border-r-0 border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white/50">
          ₹
        </span>
        <input
          type="number"
          min="0"
          step="1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="0"
          className="w-40 rounded-r-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 [appearance:textfield] focus:border-orange-500/50 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!dirty || isSaving}
        title={dirty ? "Save" : "Saved"}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          dirty ? "bg-orange-500 text-white hover:bg-orange-400" : "cursor-default text-white/20"
        }`}
      >
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
