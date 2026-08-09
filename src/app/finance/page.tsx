"use client";

import { useMemo, useState } from "react";
import { deleteField, doc, setDoc, updateDoc } from "firebase/firestore";
import { Wallet, Plus, X, Trash2, Loader2, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import { formatINR } from "@/lib/format";
import type { FinanceCategory, FinanceMonth } from "@/lib/finance-types";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function monthTotalSpent(month: FinanceMonth) {
  return Object.values(month.categories ?? {}).reduce((sum, c) => sum + (c.amount || 0), 0);
}

export default function FinancePage() {
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const allMonths = useDbList<FinanceMonth>("financeMonths");

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const monthData = allMonths.find((m) => m.id === selectedMonth);
  const income = monthData?.income ?? 0;
  const categories = useMemo(() => {
    const entries = Object.entries(monthData?.categories ?? {}) as [string, FinanceCategory][];
    return entries
      .map(([id, cat]) => ({ id, ...cat }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [monthData]);
  const totalSpent = categories.reduce((sum, c) => sum + (c.amount || 0), 0);

  const carriedOver = useMemo(() => {
    return allMonths
      .filter((m) => m.id < selectedMonth)
      .reduce((sum, m) => sum + (m.income ?? 0) - monthTotalSpent(m), 0);
  }, [allMonths, selectedMonth]);

  const availableBalance = carriedOver + income - totalSpent;

  async function saveIncome(value: number) {
    try {
      await setDoc(
        doc(db, "financeMonths", selectedMonth),
        {
          income: value,
          updatedBy: user?.email ?? null,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save income");
    }
  }

  async function saveCategoryAmount(categoryId: string, value: number) {
    try {
      // eslint-disable-next-line react-hooks/purity -- only runs from a user-triggered save click, never during render
      const updatedAt = Date.now();
      await setDoc(
        doc(db, "financeMonths", selectedMonth),
        {
          categories: { [categoryId]: { amount: value } },
          updatedBy: user?.email ?? null,
          updatedAt,
        },
        { merge: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save amount");
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    setError(null);
    try {
      const categoryId = crypto.randomUUID();
      await setDoc(
        doc(db, "financeMonths", selectedMonth),
        {
          categories: {
            [categoryId]: {
              name: newCategoryName,
              amount: newCategoryAmount ? Number(newCategoryAmount) : 0,
              createdBy: user?.email ?? null,
              createdAt: Date.now(),
            },
          },
        },
        { merge: true },
      );
      setNewCategoryName("");
      setNewCategoryAmount("");
      setShowAddCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setIsAddingCategory(false);
    }
  }

  async function deleteCategory(categoryId: string, name: string) {
    const ok = await confirm({
      title: "Delete this category?",
      description: `"${name}" and its amount for ${monthLabel(selectedMonth)} will be permanently deleted.`,
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, "financeMonths", selectedMonth), {
        [`categories.${categoryId}`]: deleteField(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: `Reset ${monthLabel(selectedMonth)}?`,
      description: "This clears income and every category amount for this month back to 0.",
      confirmLabel: "Reset",
      typeToConfirm: "RESET",
    });
    if (!ok) return;

    setIsResetting(true);
    setError(null);
    try {
      const zeroedCategories = Object.fromEntries(
        categories.map((c) => [c.id, { ...c, amount: 0 }]),
      );
      await setDoc(
        doc(db, "financeMonths", selectedMonth),
        {
          income: 0,
          categories: zeroedCategories,
          updatedBy: user?.email ?? null,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset month");
    } finally {
      setIsResetting(false);
    }
  }

  return (
      <PageBackground>
        {dialog}
        <PageHeader title="Finance" icon={Wallet} />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white backdrop-blur-sm [color-scheme:dark] focus:border-orange-500/50 focus:outline-none"
              />
              <span className="text-white/50">{monthLabel(selectedMonth)}</span>
              <button
                onClick={handleReset}
                disabled={isResetting}
                title="Reset this month"
                className="ml-auto flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isResetting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Carried Over" value={carriedOver} tone="neutral" />
              <StatTile label="Income" value={income} tone="accent" />
              <StatTile label="Spent" value={totalSpent} tone="negative" />
              <StatTile label="Balance" value={availableBalance} tone="highlight" />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h2 className="text-sm font-medium text-white/70">Income this month</h2>
              <AmountInput key={`${selectedMonth}-${income}`} value={income} onCommit={saveIncome} />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-white/70">
                  Categories for {monthLabel(selectedMonth)}{" "}
                  {categories.length > 0 && `(${categories.length})`}
                </h2>
                <button
                  onClick={() => setShowAddCategory((v) => !v)}
                  title={showAddCategory ? "Close" : "Add Category"}
                  className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-orange-400"
                >
                  {showAddCategory ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>

              {categories.length === 0 && !showAddCategory && (
                <p className="text-sm text-white/40">
                  No categories for this month yet — add one to start tracking expenses (e.g.
                  Rent, Electricity, Subscriptions). Categories are per month, so next month starts
                  fresh.
                </p>
              )}

              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <span className="flex-1 text-lg font-medium text-white">{cat.name}</span>
                  <AmountInput
                    key={`${selectedMonth}-${cat.id}-${cat.amount}`}
                    value={cat.amount}
                    onCommit={(v) => saveCategoryAmount(cat.id, v)}
                  />
                  <button
                    onClick={() => deleteCategory(cat.id, cat.name)}
                    title="Delete"
                    className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {showAddCategory && (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/30 p-4 backdrop-blur-sm">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name…"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
                  />
                  <CurrencyField>
                    <input
                      value={newCategoryAmount}
                      onChange={(e) => setNewCategoryAmount(e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      className="w-32 rounded-r-lg border border-white/10 bg-white/5 px-3 py-2 text-right text-sm text-white placeholder:text-white/40 [appearance:textfield] focus:border-orange-500/50 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </CurrencyField>
                  <button
                    onClick={addCategory}
                    disabled={!newCategoryName.trim() || isAddingCategory}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAddingCategory ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBackground>
  );
}

function CurrencyField({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="rounded-l-lg border border-r-0 border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white/50">
        ₹
      </span>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "accent" | "negative" | "highlight";
}) {
  const color =
    tone === "highlight"
      ? value >= 0
        ? "text-emerald-300"
        : "text-red-300"
      : tone === "negative"
        ? "text-red-300"
        : tone === "accent"
          ? "text-sky-300"
          : "text-white/70";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{formatINR(value)}</p>
    </div>
  );
}

function AmountInput({
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
      <CurrencyField>
        <input
          type="number"
          min="0"
          step="0.01"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="0"
          className="w-32 rounded-r-lg border border-white/10 bg-white/5 px-3 py-2 text-right text-sm text-white placeholder:text-white/40 [appearance:textfield] focus:border-orange-500/50 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </CurrencyField>
      <button
        onClick={handleSave}
        disabled={!dirty || isSaving}
        title={dirty ? "Save" : "Saved"}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          dirty
            ? "bg-orange-500 text-white hover:bg-orange-400"
            : "cursor-default text-white/20"
        }`}
      >
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
