"use client";

import { useState } from "react";
import Link from "next/link";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useDbList } from "@/lib/use-db";
import type { Product } from "@/lib/product-types";

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { confirm, dialog } = useConfirmDialog();
  const products = useDbList<Product>("products", (a, b) => b.createdAt - a.createdAt);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  async function addProduct() {
    if (!newName.trim() || !newUrl.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      await addDoc(collection(db, "products"), {
        name: newName,
        url: normalizeUrl(newUrl),
        description: newDescription,
        createdBy: user?.email ?? null,
        createdAt: Date.now(),
      });
      setNewName("");
      setNewUrl("");
      setNewDescription("");
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setIsAdding(false);
    }
  }

  async function deleteProduct(productId: string, name: string) {
    const ok = await confirm({
      title: "Delete this product?",
      description: `"${name}" will be permanently deleted.`,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "products", productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  }

  return (
    <PageBackground>
      {dialog}
      <PageHeader title="Products" icon={Globe} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white/90">
              Products {products.length > 0 && `(${products.length})`}
            </h2>
            <button
              onClick={() => setShowAdd((v) => !v)}
              title={showAdd ? "Close" : "Add Product"}
              className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10 hover:text-orange-400"
            >
              {showAdd ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </button>
          </div>

          <p className="text-xs text-white/30">
            Ares is watching over these sites — every URL gets checked automatically every 3
            hours. Click a card for the full history and stats.
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {showAdd && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/15 bg-black/30 p-4 backdrop-blur-sm">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Product name…"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Website URL…"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
              />
              <button
                onClick={addProduct}
                disabled={!newName.trim() || !newUrl.trim() || isAdding}
                className="flex w-fit items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAdding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Product
              </button>
            </div>
          )}

          {products.length === 0 && !showAdd ? (
            <p className="text-sm text-white/40">
              No products yet — add one above to keep track of the sites you&apos;ve built.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {products.map((product) =>
                editingId === product.id ? (
                  <ProductEditForm
                    key={product.id}
                    product={product}
                    onCancel={() => setEditingId(null)}
                    onSave={async (updates) => {
                      try {
                        await updateDoc(doc(db, "products", product.id), updates);
                        setEditingId(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to save product");
                      }
                    }}
                  />
                ) : (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-orange-500/40 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 truncate text-lg font-medium text-white">
                        {product.name}
                      </h3>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingId(product.id);
                          }}
                          title="Edit"
                          className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/80"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            deleteProduct(product.id, product.name);
                          }}
                          title="Delete"
                          className="rounded-lg p-1.5 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-sm text-white/50">{product.description}</p>
                    )}
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex w-fit items-center gap-1.5 truncate text-xs text-orange-300/80 hover:text-orange-300 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {product.url.replace(/^https?:\/\//, "")}
                    </a>
                    <div className="flex items-center justify-between gap-2">
                      <MonitorStatus product={product} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}

function formatRelativeTime(ts: number) {
  const diffMs = Date.now() - ts;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function MonitorStatus({ product }: { product: Product }) {
  if (!product.lastCheckedAt || !product.lastStatus) {
    return <p className="text-xs text-white/30">Not checked yet</p>;
  }

  const config = {
    up: { icon: CheckCircle2, label: "Up", className: "text-emerald-400" },
    down: { icon: XCircle, label: "Down", className: "text-red-400" },
    error: { icon: AlertTriangle, label: "Error", className: "text-amber-400" },
  }[product.lastStatus];

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${config.className}`}
      title={product.lastError ?? undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
      <span className="text-white/30">· checked {formatRelativeTime(product.lastCheckedAt)}</span>
    </div>
  );
}

function ProductEditForm({
  product,
  onSave,
  onCancel,
}: {
  product: Product;
  onSave: (updates: Partial<Product>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [url, setUrl] = useState(product.url);
  const [description, setDescription] = useState(product.description);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !url.trim() || isSaving) return;
    setIsSaving(true);
    await onSave({ name, url: normalizeUrl(url), description });
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-orange-500/30 bg-black/30 p-4 backdrop-blur-sm">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Product name…"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Website URL…"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-orange-500/50 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || !url.trim() || isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:opacity-40"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
