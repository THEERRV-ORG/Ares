"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bold,
  BookOpenText,
  CheckCircle2,
  CircleCheck,
  CircleX,
  Columns2,
  EyeOff,
  Eye,
  FileCode2,
  FileText,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageBackground } from "@/components/page-background";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { ArticlePreview, coverSrc, type LocalImages } from "@/components/website/article-preview";
import { samplePosts } from "@/lib/website-posts-sample";
import {
  BLOG_CATEGORIES,
  LIMITS,
  publicUrl,
  readTime,
  slugify,
  toMarkdownFile,
  wordCount,
  POST_STATUS_STYLES,
  SITE_LINKS,
  seoChecks,
  type Post,
} from "@/lib/website-posts";

type View = "write" | "split" | "preview";

// Width kept separate so fixed-width inputs don't fight a w-full default.
const inputBase =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-orange-500/50 focus:outline-none";
const inputClass = `w-full ${inputBase}`;

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span className={`text-xs tabular-nums ${over ? "text-red-400" : "text-white/35"}`}>
      {value}/{max}
    </span>
  );
}

function Field({
  label,
  hint,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  counter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-medium text-white/60">
        {label}
        {counter}
      </span>
      {children}
      {hint && <span className="text-xs text-white/35">{hint}</span>}
    </label>
  );
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      {children}
    </section>
  );
}

/** Free-text tags: Enter or comma adds one, × removes it. */
function ChipsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const next = draft.trim().replace(/,$/, "");
    if (next && !value.includes(next)) onChange([...value, next]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5 focus-within:border-orange-500/50">
      {value.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 rounded-md bg-white/10 py-0.5 pl-2 pr-1 text-xs text-white/80"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="rounded p-0.5 text-white/40 hover:text-white"
            title={`Remove ${v}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1.5 py-1 text-sm text-white placeholder:text-white/35 focus:outline-none"
      />
    </div>
  );
}

export function PostEditor({ initial, isNew }: { initial: Post; isNew: boolean }) {
  const isCaseStudy = initial.kind === "case-study";
  const noun = isCaseStudy ? "case study" : "blog post";
  const listHref = isCaseStudy ? "/website/case-studies" : "/website/blog";

  const [post, setPost] = useState<Post>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [view, setView] = useState<View>("split");
  const [schedule, setSchedule] = useState(initial.status === "Scheduled");
  // Images chosen in this session, keyed by the site path they will be saved to.
  const [localImages, setLocalImages] = useState<LocalImages>({});
  const [linkPicker, setLinkPicker] = useState<{ start: number; end: number } | null>(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [showFile, setShowFile] = useState(false);
  const [busy, setBusy] = useState<"draft" | "publish" | "unpublish" | "delete" | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const bodyId = useId();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const bodyImageInputId = useId();

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set<K extends keyof Post>(key: K, value: Post[K]) {
    setDirty(true);
    setPost((p) => {
      const next = { ...p, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  }

  /** Wraps the selection (or a placeholder) in markdown, keeping the textarea focused. */
  function bodyEl() {
    return document.getElementById(bodyId) as HTMLTextAreaElement | null;
  }

  function wrap(before: string, after = "", placeholder = "text") {
    const el = bodyEl();
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    set("body", next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  /** Prefixes every selected line (or the current line) — headings, lists, quotes. */
  function prefixLines(prefix: string | ((i: number) => string)) {
    const el = bodyEl();
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const lineEndIdx = value.indexOf("\n", e);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value
      .slice(lineStart, lineEnd)
      .split("\n")
      .map((line, i) => (typeof prefix === "function" ? prefix(i) : prefix) + line)
      .join("\n");
    set("body", value.slice(0, lineStart) + block + value.slice(lineEnd));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + block.length);
    });
  }

  /** Registers a picked file under the site path it will be uploaded to, and returns that path. */
  function addLocalImage(file: File, name: string) {
    const path = `/insights/${post.slug || "untitled"}-${name}.webp`;
    const url = URL.createObjectURL(file);
    setLocalImages((m) => ({ ...m, [path]: url }));
    return path;
  }

  function imageName() {
    return `img-${Date.now().toString(36)}`;
  }

  /** Inserts markdown for each image at the cursor, selecting the first description to type over. */
  function insertBodyImages(files: File[]) {
    const el = bodyEl();
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!el || images.length === 0) return false;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const placeholder = "Describe the image";
    const snippet = images
      .map((f, i) => `![${placeholder}](${addLocalImage(f, `${imageName()}${i}`)})`)
      .join("\n\n");
    const before = value.slice(0, s);
    const lead = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    set("body", `${before}${lead}${snippet}\n\n${value.slice(e)}`);
    const selStart = s + lead.length + 2;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(selStart, selStart + placeholder.length);
    });
    return true;
  }

  function openLinkPicker() {
    const el = bodyEl();
    if (!el) return;
    setLinkQuery("");
    setLinkPicker({ start: el.selectionStart, end: el.selectionEnd });
  }

  function insertLink(href: string, title: string) {
    if (!linkPicker) return;
    const { start, end } = linkPicker;
    const value = post.body;
    const text = value.slice(start, end) || title;
    const md = `[${text}](${href})`;
    set("body", value.slice(0, start) + md + value.slice(end));
    setLinkPicker(null);
    setTimeout(() => {
      const el = bodyEl();
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1 + text.length);
    });
  }

  type Actions = {
    wrap: typeof wrap;
    prefixLines: typeof prefixLines;
    openLinkPicker: typeof openLinkPicker;
    pickImage: () => void;
  };
  const tools: { icon: typeof Bold; label: string; apply: (a: Actions) => void }[] = [
    { icon: Heading2, label: "Section heading", apply: (a) => a.prefixLines("## ") },
    { icon: Heading3, label: "Sub-heading", apply: (a) => a.prefixLines("### ") },
    { icon: Bold, label: "Bold", apply: (a) => a.wrap("**", "**") },
    { icon: Italic, label: "Italic", apply: (a) => a.wrap("_", "_") },
    { icon: Link2, label: "Link to a post or page", apply: (a) => a.openLinkPicker() },
    { icon: List, label: "Bullet list", apply: (a) => a.prefixLines("- ") },
    { icon: ListOrdered, label: "Numbered list", apply: (a) => a.prefixLines((i) => `${i + 1}. `) },
    { icon: CheckCircle2, label: "Outcome check (✅)", apply: (a) => a.prefixLines("- ✅ ") },
    { icon: Quote, label: "Pull quote", apply: (a) => a.prefixLines("> ") },
    { icon: ImagePlus, label: "Image (or paste / drop one in)", apply: (a) => a.pickImage() },
  ];

  const words = wordCount(post.body);
  const missing = useMemo(() => {
    const m: string[] = [];
    if (!post.title.trim()) m.push("title");
    if (!post.slug.trim()) m.push("URL slug");
    if (!post.excerpt.trim()) m.push("excerpt");
    if (!isCaseStudy && !post.category.trim()) m.push("category");
    if (isCaseStudy && !post.client.trim()) m.push("client");
    if (!post.body.trim()) m.push("body");
    if (isCaseStudy && !post.clientApproved) m.push("client approval");
    return m;
  }, [post, isCaseStudy]);

  // PLACEHOLDER — saving and publishing are not wired to GitHub yet.
  async function save(mode: "draft" | "publish") {
    if (mode === "publish" && missing.length) {
      setNotice({ tone: "error", text: `Still needed before publishing: ${missing.join(", ")}.` });
      return;
    }
    setBusy(mode);
    setNotice(null);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);
    setDirty(false);
    const status = mode === "draft" ? "Draft" : schedule ? "Scheduled" : "Published";
    setPost((p) => ({ ...p, status }));
    setNotice({
      tone: "info",
      text:
        mode === "draft"
          ? "UI preview — nothing was saved. Once connected, drafts are kept on their own branch with a Vercel preview link."
          : `UI preview — nothing was published. Once connected, this commits ${post.slug}.md to theerrv-final and it goes live at ${publicUrl(post.slug)} in about a minute.`,
    });
  }

  // PLACEHOLDER — like save(), these only simulate the GitHub commit for now.
  async function unpublish() {
    const ok = await confirm({
      title: `Unpublish this ${noun}?`,
      description: `It comes off theerrv.com (the link will show "not found") but stays here as a draft you can publish again.`,
      confirmLabel: "Unpublish",
    });
    if (!ok) return;
    setBusy("unpublish");
    setNotice(null);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);
    setSchedule(false);
    setPost((p) => ({ ...p, status: "Draft" }));
    setNotice({
      tone: "info",
      text: `UI preview — nothing changed on the site. Once connected, this takes ${publicUrl(post.slug)} offline and keeps the post as a draft.`,
    });
  }

  async function deletePost() {
    const ok = await confirm({
      title: `Delete this ${noun}?`,
      description: `"${post.title || "Untitled"}" and its images are removed for good${
        post.status === "Published" ? ", and the page comes off theerrv.com" : ""
      }. It can only be brought back from the website repo's history.`,
      typeToConfirm: post.slug,
    });
    if (!ok) return;
    setBusy("delete");
    setNotice(null);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);
    setDirty(false);
    setNotice({
      tone: "info",
      text: `UI preview — nothing was deleted. Once connected, this removes ${post.slug}.md from theerrv-final and returns you to the list.`,
    });
  }

  const viewButtons: { id: View; icon: typeof Pencil; label: string }[] = [
    { id: "write", icon: Pencil, label: "Write" },
    { id: "split", icon: Columns2, label: "Split" },
    { id: "preview", icon: Eye, label: "Preview" },
  ];

  const checks = seoChecks(post);
  const passed = checks.filter((c) => c.ok).length;
  const scoreTone =
    passed >= checks.length - 1 ? "text-emerald-300" : passed >= checks.length / 2 ? "text-amber-300" : "text-red-300";

  const linkOptions = useMemo(() => {
    const posts = [...samplePosts("blog"), ...samplePosts("case-study")]
      .filter((p) => p.slug !== post.slug && p.status === "Published")
      .map((p) => ({
        group: p.kind === "case-study" ? "Case studies" : "Blog posts",
        title: p.title,
        path: `/insights/${p.slug}`,
      }));
    const q = linkQuery.trim().toLowerCase();
    return [...posts, ...SITE_LINKS].filter(
      (o) => !q || o.title.toLowerCase().includes(q) || o.path.includes(q),
    );
  }, [linkQuery, post.slug]);

  const googleTitle = `${post.title || "Your title"} | Theerrv Technologies`;
  const googleDesc = post.description || post.excerpt || "Add a meta description…";

  return (
    <PageBackground>
      {dialog}
      <PageHeader
        title={isNew ? `New ${noun}` : `Edit ${noun}`}
        icon={isCaseStudy ? BookOpenText : FileText}
        backHref={listHref}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Action bar */}
        <div className="sticky top-0 z-20 border-b border-white/10 bg-black/60 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3">
            <span className={`rounded-full px-2 py-0.5 text-xs ${POST_STATUS_STYLES[post.status]}`}>
              {post.status}
            </span>
            <span className="hidden text-xs text-white/40 sm:inline">
              {words} words · {readTime(post.body)}
              {dirty && " · Unsaved changes"}
            </span>
            {dirty && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 sm:hidden" title="Unsaved changes" />
            )}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowFile((v) => !v)}
                title="See the markdown file this becomes"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 sm:px-2.5"
              >
                <FileCode2 className="h-4 w-4" />
                <span className="hidden sm:inline">File</span>
              </button>
              <button
                onClick={() => save("draft")}
                disabled={busy !== null}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors enabled:hover:bg-white/10 disabled:opacity-40 sm:px-4"
              >
                {busy === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save draft</span>
              </button>
              <button
                onClick={() => save("publish")}
                disabled={busy !== null}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition-colors enabled:hover:bg-orange-400 disabled:opacity-40 sm:px-4"
              >
                {busy === "publish" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {schedule ? "Schedule" : post.status === "Published" ? "Update" : "Publish"}
              </button>
            </div>
          </div>
          {notice && (
            <div
              className={`border-t px-4 py-2 text-center text-xs ${
                notice.tone === "error"
                  ? "border-red-500/20 bg-red-500/10 text-red-300"
                  : "border-sky-500/20 bg-sky-500/10 text-sky-200"
              }`}
            >
              {notice.text}
              <button onClick={() => setNotice(null)} className="ml-2 underline opacity-70 hover:opacity-100">
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <textarea
                value={post.title}
                onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
                rows={1}
                placeholder={isCaseStudy ? "How we helped … achieve …" : "Post title"}
                className="field-sizing-content w-full resize-none bg-transparent text-3xl font-bold leading-tight tracking-tight text-white placeholder:text-white/25 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <Counter value={post.title.length} max={LIMITS.title} />
                <span className="text-white/35">theerrv.com/insights/</span>
                <input
                  value={post.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                  placeholder="url-slug"
                  className="min-w-40 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-orange-300/90 hover:border-white/10 focus:border-orange-500/50 focus:outline-none"
                />
              </div>
            </div>

            <Field
              label="Excerpt"
              hint="One or two sentences shown on the insights page and at the top of the article."
              counter={<Counter value={post.excerpt.length} max={LIMITS.excerpt} />}
            >
              <textarea
                value={post.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                placeholder="What will the reader get from this?"
                className={`${inputClass} resize-none`}
              />
            </Field>

            {/* Body editor */}
            <div className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1.5">
                {view !== "preview" &&
                  tools.map(({ icon: Icon, label, apply }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        apply({
                          wrap,
                          prefixLines,
                          openLinkPicker,
                          pickImage: () => document.getElementById(bodyImageInputId)?.click(),
                        })
                      }
                      title={label}
                      className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                <div className="ml-auto flex rounded-lg bg-white/5 p-0.5">
                  {viewButtons.map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setView(id)}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                        view === id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`grid flex-1 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
                {view !== "preview" && (
                  <textarea
                    id={bodyId}
                    value={post.body}
                    onChange={(e) => set("body", e.target.value)}
                    onPaste={(e) => {
                      if (insertBodyImages([...e.clipboardData.files])) e.preventDefault();
                    }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes("Files")) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (insertBodyImages([...e.dataTransfer.files])) e.preventDefault();
                    }}
                    spellCheck
                    placeholder="Write in markdown…"
                    className="min-h-[560px] w-full resize-none bg-transparent p-5 font-mono text-sm leading-relaxed text-white/85 placeholder:text-white/25 focus:outline-none"
                  />
                )}
                {view !== "write" && (
                  <div
                    className={`max-h-[80vh] overflow-y-auto p-3 ${view === "split" ? "border-t border-white/10 lg:border-l lg:border-t-0" : ""}`}
                  >
                    <ArticlePreview post={post} localImages={localImages} />
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-white/35">
              Markdown tips: <code className="text-white/55">## Heading</code> for sections,{" "}
              <code className="text-white/55">- ✅ item</code> for an outcome check,{" "}
              <code className="text-white/55">&gt; quote</code> for a pull quote. Paste or drop
              images straight into the text.
            </p>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            <SideCard title="Publishing">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
                {[
                  { id: false, label: "Publish now" },
                  { id: true, label: "Schedule" },
                ].map(({ id, label }) => (
                  <button
                    key={label}
                    onClick={() => setSchedule(id)}
                    className={`rounded-md py-1.5 text-xs transition-colors ${
                      schedule === id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Field label={schedule ? "Goes live on" : "Publish date"}>
                <input
                  type="date"
                  value={post.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={`${inputClass} [color-scheme:dark]`}
                />
              </Field>
              <button
                type="button"
                onClick={() => set("featured", !post.featured)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                  post.featured
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Star className={`h-4 w-4 ${post.featured ? "fill-current" : ""}`} />
                  Featured
                </span>
                <span className="text-xs opacity-70">
                  {post.featured ? "Shown first on the site" : "Off"}
                </span>
              </button>
            </SideCard>

            {isCaseStudy ? (
              <SideCard title="Project">
                <button
                  type="button"
                  onClick={() => set("clientApproved", !post.clientApproved)}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    post.clientApproved
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="block font-medium">
                      {post.clientApproved ? "Client approved publication" : "Client approval needed"}
                    </span>
                    <span className="text-xs opacity-75">
                      {post.clientApproved
                        ? "They've signed off on this case study going public."
                        : "Tick once the client has agreed — publishing is blocked until then."}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    title={post.logo ? "Replace logo" : "Upload client logo"}
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/5 text-white/40 transition-colors hover:border-orange-500/40 hover:text-white/70"
                  >
                    {post.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- blob URL or remote site path
                      <img src={coverSrc(post.logo, localImages)} alt="Client logo" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </button>
                  <div className="text-xs text-white/40">
                    <p className="text-white/60">Client logo</p>
                    <p>PNG or SVG with a transparent background works best.</p>
                    {post.logo && (
                      <button onClick={() => set("logo", "")} className="mt-0.5 text-red-300/80 hover:text-red-300">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <Field label="Client">
                  <input
                    value={post.client}
                    onChange={(e) => set("client", e.target.value)}
                    placeholder="Client or organisation"
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Industry">
                    <input
                      value={post.industry}
                      onChange={(e) => set("industry", e.target.value)}
                      placeholder="e.g. Healthcare"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Duration">
                    <input
                      value={post.duration}
                      onChange={(e) => set("duration", e.target.value)}
                      placeholder="e.g. 8 weeks"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Services">
                  <ChipsInput
                    value={post.services}
                    onChange={(v) => set("services", v)}
                    placeholder="Website, Dashboard…"
                  />
                </Field>
                <Field label="Tech stack">
                  <ChipsInput
                    value={post.stack}
                    onChange={(v) => set("stack", v)}
                    placeholder="React, Firebase…"
                  />
                </Field>
              </SideCard>
            ) : (
              <SideCard title="Details">
                <Field label="Category">
                  <input
                    value={post.category}
                    onChange={(e) => set("category", e.target.value)}
                    list="blog-categories"
                    placeholder="Pick or type a new one"
                    className={inputClass}
                  />
                  <datalist id="blog-categories">
                    {BLOG_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
              </SideCard>
            )}

            {isCaseStudy && (
              <SideCard title="Results">
                <p className="-mt-2 text-xs text-white/40">
                  Headline numbers shown as stat cards at the top of the case study.
                </p>
                {post.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={r.value}
                      onChange={(e) =>
                        set(
                          "results",
                          post.results.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                        )
                      }
                      placeholder="3×"
                      className={`${inputBase} w-20 shrink-0`}
                    />
                    <input
                      value={r.label}
                      onChange={(e) =>
                        set(
                          "results",
                          post.results.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                        )
                      }
                      placeholder="Online donations"
                      className={`${inputBase} min-w-0 flex-1`}
                    />
                    <button
                      onClick={() => set("results", post.results.filter((_, j) => j !== i))}
                      title="Remove"
                      className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {post.results.length < 4 && (
                  <button
                    onClick={() => set("results", [...post.results, { value: "", label: "" }])}
                    className="flex items-center gap-1.5 self-start text-xs text-orange-300 hover:text-orange-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add result
                  </button>
                )}
              </SideCard>
            )}

            {isCaseStudy && (
              <SideCard title="Screenshots">
                <p className="-mt-2 text-xs text-white/40">
                  Before/after shots or key screens, shown as a gallery under the story.
                </p>
                {post.gallery.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {post.gallery.map((g, i) => (
                      <div key={g.src} className="flex flex-col gap-1.5">
                        <div className="group relative overflow-hidden rounded-lg border border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL or remote site path */}
                          <img src={coverSrc(g.src, localImages)} alt={g.caption} className="aspect-[4/3] w-full object-cover" />
                          <button
                            onClick={() => set("gallery", post.gallery.filter((_, j) => j !== i))}
                            title="Remove"
                            className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-white/70 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <input
                          value={g.caption}
                          onChange={(e) =>
                            set(
                              "gallery",
                              post.gallery.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)),
                            )
                          }
                          list="gallery-captions"
                          placeholder="Caption"
                          className={`${inputClass} py-1 text-xs`}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <datalist id="gallery-captions">
                  <option value="Before" />
                  <option value="After" />
                </datalist>
                {post.gallery.length < 6 && (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 self-start text-xs text-orange-300 hover:text-orange-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add screenshots
                  </button>
                )}
              </SideCard>
            )}

            {isCaseStudy && (
              <SideCard title="Testimonial">
                <textarea
                  value={post.testimonial}
                  onChange={(e) => set("testimonial", e.target.value)}
                  rows={3}
                  placeholder="What the client said…"
                  className={`${inputClass} resize-none`}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={post.testimonialBy}
                    onChange={(e) => set("testimonialBy", e.target.value)}
                    placeholder="Name"
                    className={inputClass}
                  />
                  <input
                    value={post.testimonialRole}
                    onChange={(e) => set("testimonialRole", e.target.value)}
                    placeholder="Role, company"
                    className={inputClass}
                  />
                </div>
              </SideCard>
            )}

            <SideCard title="Cover image">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  set("cover", addLocalImage(file, "cover"));
                  e.target.value = "";
                }}
              />
              {post.cover ? (
                <div className="group relative overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob URL or remote site path */}
                  <img
                    src={coverSrc(post.cover, localImages)}
                    alt="Cover"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/25"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => set("cover", "")}
                      className="rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white hover:bg-red-500/40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-white/40 transition-colors hover:border-orange-500/40 hover:text-white/70"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Upload PNG, JPG or WebP</span>
                </button>
              )}
              <p className="text-xs text-white/35">
                Resized to 1600px wide and saved as WebP. 16:9 works best.
              </p>
            </SideCard>

            <SideCard title="Author">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={post.author}
                  onChange={(e) => set("author", e.target.value)}
                  placeholder="Theerrv Technologies"
                  className={inputClass}
                />
                <input
                  value={post.authorRole}
                  onChange={(e) => set("authorRole", e.target.value)}
                  placeholder="Role (optional)"
                  className={inputClass}
                />
              </div>
            </SideCard>

            <SideCard title="SEO checklist">
              <div className="-mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-bold tabular-nums ${scoreTone}`}>
                  {passed}/{checks.length}
                </span>
                <span className="text-xs text-white/40">checks passed</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    scoreTone === "text-emerald-300"
                      ? "bg-emerald-400"
                      : scoreTone === "text-amber-300"
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${(passed / checks.length) * 100}%` }}
                />
              </div>
              <ul className="flex flex-col gap-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex gap-2 text-xs">
                    {c.ok ? (
                      <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <CircleX className="mt-px h-3.5 w-3.5 shrink-0 text-white/30" />
                    )}
                    <span>
                      <span className={c.ok ? "text-white/60" : "text-white/85"}>{c.label}</span>
                      {!c.ok && <span className="block text-white/40">{c.fix}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </SideCard>

            <SideCard title="Search & sharing">
              <Field
                label="Meta description"
                hint="Leave empty to use the excerpt."
                counter={<Counter value={post.description.length} max={LIMITS.description} />}
              >
                <textarea
                  value={post.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder={post.excerpt || "What Google shows under the title"}
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Keywords">
                <ChipsInput
                  value={post.keywords}
                  onChange={(v) => set("keywords", v)}
                  placeholder="Add a keyword, press Enter"
                />
              </Field>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-white/60">Google preview</span>
                <div className="rounded-xl bg-white p-4">
                  <p className="truncate text-xs text-[#202124]">{publicUrl(post.slug)}</p>
                  <p className="mt-1 line-clamp-1 text-lg leading-snug text-[#1a0dab]">{googleTitle}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{googleDesc}</p>
                </div>
                {googleTitle.length > 60 && (
                  <span className="text-xs text-amber-300/80">
                    Title is {googleTitle.length} characters with the site name — Google cuts off around 60.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-white/60">Link preview (WhatsApp, LinkedIn)</span>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1f2c34]">
                  <div className="aspect-[1.91/1] bg-gradient-to-br from-indigo-950 to-slate-900">
                    {post.cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- blob URL or remote site path
                      <img
                        src={coverSrc(post.cover, localImages)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-medium text-white">{post.title || "Your title"}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/55">{googleDesc}</p>
                    <p className="mt-1 text-[11px] text-white/35">theerrv.com</p>
                  </div>
                </div>
              </div>
            </SideCard>

            {!isNew && (
              <SideCard title="Manage">
                {post.status === "Published" && (
                  <Link
                    href={publicUrl(post.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/50 hover:text-orange-300"
                  >
                    View live page ↗
                  </Link>
                )}
                {post.status !== "Draft" && (
                  <button
                    onClick={unpublish}
                    disabled={busy !== null}
                    className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left text-sm text-white/80 transition-colors enabled:hover:bg-white/10 disabled:opacity-40"
                  >
                    {busy === "unpublish" ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <EyeOff className="h-4 w-4 shrink-0 text-white/50" />
                    )}
                    <span>
                      <span className="block">Unpublish</span>
                      <span className="text-xs text-white/40">
                        {post.status === "Scheduled"
                          ? "Cancel the schedule and keep it as a draft."
                          : "Take it off the site, keep it as a draft."}
                      </span>
                    </span>
                  </button>
                )}
                <button
                  onClick={deletePost}
                  disabled={busy !== null}
                  className="flex items-center gap-3 rounded-lg border border-red-500/20 px-3 py-2.5 text-left text-sm text-red-300 transition-colors enabled:hover:bg-red-500/10 disabled:opacity-40"
                >
                  {busy === "delete" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    <span className="block">Delete {noun}</span>
                    <span className="text-xs text-red-300/60">Remove it and its images for good.</span>
                  </span>
                </button>
              </SideCard>
            )}
          </aside>
        </div>
      </div>

      <input
        id={bodyImageInputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          insertBodyImages([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) set("logo", addLocalImage(file, "logo"));
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])].slice(0, 6 - post.gallery.length);
          const added = files.map((f, i) => ({
            src: addLocalImage(f, `${imageName()}${i}`),
            caption: "",
          }));
          set("gallery", [...post.gallery, ...added]);
          e.target.value = "";
        }}
      />

      {linkPicker && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[12vh]" onClick={() => setLinkPicker(null)}>
          <div
            className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-white/40" />
              <input
                autoFocus
                value={linkQuery}
                onChange={(e) => setLinkQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setLinkPicker(null);
                  if (e.key === "Enter" && /^https?:\/\//.test(linkQuery.trim())) {
                    insertLink(linkQuery.trim(), linkQuery.trim());
                  }
                }}
                placeholder="Search posts and pages, or paste a URL…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button onClick={() => setLinkPicker(null)} className="rounded-lg p-1 text-white/50 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {/^https?:\/\//.test(linkQuery.trim()) && (
                <button
                  onClick={() => insertLink(linkQuery.trim(), linkQuery.trim())}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                >
                  <Link2 className="h-4 w-4 text-orange-300" />
                  Link to <span className="truncate text-orange-300">{linkQuery.trim()}</span>
                </button>
              )}
              {["Blog posts", "Case studies", "Services", "Pages"].map((group) => {
                const items = linkOptions.filter((o) => o.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-2">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
                      {group}
                    </p>
                    {items.map((o) => (
                      <button
                        key={o.path}
                        onClick={() => insertLink(o.path, o.title)}
                        className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-white/10"
                      >
                        <span className="truncate text-sm text-white/90">{o.title}</span>
                        <span className="truncate font-mono text-xs text-white/35">{o.path}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {linkOptions.length === 0 && !/^https?:\/\//.test(linkQuery.trim()) && (
                <p className="px-3 py-6 text-center text-sm text-white/40">No matches. Paste a full URL to link outside the site.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowFile(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#111] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-white">{post.slug || "untitled"}.md</p>
                <p className="text-xs text-white/40">theerrv-final / src/content/insights</p>
              </div>
              <button onClick={() => setShowFile(false)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="overflow-auto p-5 font-mono text-xs leading-relaxed text-white/75">
              {toMarkdownFile(post)}
            </pre>
          </div>
        </div>
      )}
    </PageBackground>
  );
}
