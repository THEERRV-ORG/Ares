import { marked } from "marked";

/**
 * Blog posts and case studies for theerrv.com. On the website both are markdown files in
 * `src/content/insights/` of the theerrv-final repo — a case study is simply an article with
 * `category: Case Study`. Ares edits the same shape and will commit it back to that repo.
 */

export type PostKind = "blog" | "case-study";

export const POST_STATUSES = ["Published", "Draft", "Scheduled"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_STYLES: Record<PostStatus, string> = {
  Published: "bg-emerald-500/10 text-emerald-300",
  Draft: "bg-white/10 text-white/60",
  Scheduled: "bg-amber-500/10 text-amber-300",
};

/** Categories already used on the site; the editor also accepts a new one. */
export const BLOG_CATEGORIES = [
  "AI",
  "Cost & Budgeting",
  "Craft",
  "Data & Automation",
  "Decisions",
  "Guides",
  "Modernization",
  "Operations",
] as const;

export const CASE_STUDY_CATEGORY = "Case Study";

export const SITE_URL = "https://www.theerrv.com";

export interface CaseStudyResult {
  value: string;
  label: string;
}

export interface GalleryImage {
  src: string; // site path the image is saved to, e.g. /insights/<slug>-before.webp
  caption: string;
}

export interface Post {
  slug: string;
  kind: PostKind;
  status: PostStatus;
  title: string;
  category: string;
  date: string; // YYYY-MM-DD — publish date, or the scheduled date
  featured: boolean;
  author: string;
  authorRole: string;
  excerpt: string;
  description: string;
  keywords: string[];
  cover: string;
  body: string;
  // Case-study-only fields
  client: string;
  industry: string;
  duration: string;
  services: string[];
  stack: string[];
  results: CaseStudyResult[];
  testimonial: string;
  testimonialBy: string;
  testimonialRole: string;
  logo: string;
  gallery: GalleryImage[];
  /** The client has signed off on this case study going public. Required to publish. */
  clientApproved: boolean;
  /** Published, with newer edits saved as a draft that isn't live yet. Set by the API. */
  hasDraftChanges?: boolean;
}

export const LIMITS = {
  title: 70,
  excerpt: 220,
  description: 160,
} as const;

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export function wordCount(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/** Same estimate the website uses: ~200 wpm, rounded, never zero. */
export function readTime(body: string) {
  return `${Math.max(1, Math.round(wordCount(body) / 200))} min read`;
}

/** Mirrors the website's renderer (src/data/insights.js) so the preview matches the live page. */
export function renderPostHtml(body: string) {
  const html = marked.parse(body, { async: false });
  return html
    .replace(/<li>\s*(?:✅|&#x2705;)\s*/g, '<li class="check">')
    .replace(/<blockquote>/g, '<blockquote class="pull">');
}

export function publicUrl(slug: string) {
  return `${SITE_URL}/insights/${slug || "your-post-slug"}`;
}

const BLOG_TEMPLATE = `Open with the problem your reader has, in two or three sentences.

## The first point

Explain it plainly. Use a list when you have parallel items:

- First item
- Second item

> A short line worth pulling out as a quote.

## What to do next

Close with a clear takeaway.
`;

const CASE_STUDY_TEMPLATE = `One paragraph on who the client is and why they came to us.

## The challenge

What wasn't working, in the client's terms.

## What we built

The solution — the key decisions, not every feature.

## Results

- ✅ First measurable outcome
- ✅ Second measurable outcome

> A line from the client, or the one sentence that sums up the project.
`;

export function emptyPost(kind: PostKind): Post {
  return {
    slug: "",
    kind,
    status: "Draft",
    title: "",
    category: kind === "case-study" ? CASE_STUDY_CATEGORY : "",
    date: new Date().toISOString().slice(0, 10),
    featured: false,
    author: "",
    authorRole: "",
    excerpt: "",
    description: "",
    keywords: [],
    cover: "",
    body: kind === "case-study" ? CASE_STUDY_TEMPLATE : BLOG_TEMPLATE,
    client: "",
    industry: "",
    duration: "",
    services: [],
    stack: [],
    results: kind === "case-study" ? [{ value: "", label: "" }] : [],
    testimonial: "",
    testimonialBy: "",
    testimonialRole: "",
    logo: "",
    gallery: [],
    clientApproved: false,
  };
}

/**
 * The markdown file this post becomes in theerrv-final. Empty fields are left out; the
 * case-study extras (industry, results…) are written now so the website can start showing
 * them once its case study page is updated to read them.
 */
/** Kept in the frontmatter of files on a draft branch only; never reaches the live site. */
export type DraftFileStatus = "draft" | "scheduled";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function toMarkdownFile(post: Post, status?: DraftFileStatus) {
  const lines: [string, string][] = [
    ["status", status ?? ""],
    ["title", post.title],
    ["category", post.category],
    ["client", post.client],
    ["industry", post.industry],
    ["duration", post.duration],
    ["services", post.services.join(", ")],
    ["stack", post.stack.join(", ")],
    ...post.results
      .filter((r) => r.value || r.label)
      .map((r, i): [string, string] => [`result${i + 1}`, `${r.value} | ${r.label}`]),
    ["logo", post.logo],
    ...post.gallery.map((g, i): [string, string] => [`image${i + 1}`, `${g.src} | ${g.caption}`]),
    ["testimonial", post.testimonial],
    ["testimonialBy", post.testimonialBy],
    ["testimonialRole", post.testimonialRole],
    ["clientApproved", post.kind === "case-study" && post.clientApproved ? "true" : ""],
    ["date", post.date],
    ["readTime", readTime(post.body)],
    ["featured", post.featured ? "true" : ""],
    ["author", post.author],
    ["authorRole", post.authorRole],
    ["cover", post.cover],
    ["excerpt", post.excerpt],
    ["description", post.description],
    ["keywords", post.keywords.join(", ")],
  ];
  const front = lines
    .filter(([, value]) => value.trim() !== "")
    .map(([key, value]) => `${key}: ${value.replace(/\s*\n\s*/g, " ")}`)
    .join("\n");
  return `---\n${front}\n---\n\n${post.body.trim()}\n`;
}

/** Same frontmatter rules as the website's loader (theerrv-final: src/data/insights.js). */
function parseFrontmatter(raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw.trim());
  if (!match) return { meta: {} as Record<string, string>, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    if (!key) continue;
    meta[key] = line
      .slice(at + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return { meta, body: match[2] };
}

function list(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function pair(value: string | undefined): [string, string] | null {
  if (!value?.trim()) return null;
  const at = value.indexOf("|");
  return at === -1 ? [value.trim(), ""] : [value.slice(0, at).trim(), value.slice(at + 1).trim()];
}

/** Reads a markdown file from the website repo back into an editable post. */
export function fromMarkdownFile(raw: string, slug: string): { post: Post; status?: DraftFileStatus } {
  const { meta, body } = parseFrontmatter(raw);
  const kind: PostKind = meta.category === CASE_STUDY_CATEGORY ? "case-study" : "blog";
  const status = meta.status === "draft" || meta.status === "scheduled" ? meta.status : undefined;
  const results: CaseStudyResult[] = [];
  for (let i = 1; i <= 4; i++) {
    const p = pair(meta[`result${i}`]);
    if (p) results.push({ value: p[0], label: p[1] });
  }
  const gallery: GalleryImage[] = [];
  for (let i = 1; i <= 6; i++) {
    const p = pair(meta[`image${i}`]);
    if (p?.[0]) gallery.push({ src: p[0], caption: p[1] });
  }

  const post: Post = {
    ...emptyPost(kind),
    slug,
    status: status === "scheduled" ? "Scheduled" : status === "draft" ? "Draft" : "Published",
    title: meta.title ?? slug,
    category: meta.category ?? "",
    date: meta.date ?? "",
    featured: meta.featured === "true",
    author: meta.author ?? "",
    authorRole: meta.authorRole ?? "",
    excerpt: meta.excerpt ?? "",
    description: meta.description ?? "",
    keywords: list(meta.keywords),
    cover: meta.cover ?? "",
    body: body.replace(/^\s*\n/, ""),
    client: meta.client ?? "",
    industry: meta.industry ?? "",
    duration: meta.duration ?? "",
    services: list(meta.services),
    stack: list(meta.stack),
    results,
    testimonial: meta.testimonial ?? "",
    testimonialBy: meta.testimonialBy ?? "",
    testimonialRole: meta.testimonialRole ?? "",
    logo: meta.logo ?? "",
    gallery,
    // Posts published before approval tracking existed were public already.
    clientApproved: meta.clientApproved === "true" || (kind === "case-study" && !status),
  };
  return { post, status };
}

/** Every site image path (/insights/…) the post points at — cover, logo, gallery and body. */
export function referencedImages(post: Post) {
  const paths = [
    post.cover,
    post.logo,
    ...post.gallery.map((g) => g.src),
    ...[...post.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]),
  ];
  return [...new Set(paths.filter((p) => p.startsWith("/insights/")))];
}

/** Pages a post can link to, besides other posts. Paths match theerrv.com routes. */
export const SITE_LINKS: { title: string; path: string; group: string }[] = [
  { group: "Services", title: "Product Engineering & Custom Software", path: "/services/product-engineering" },
  { group: "Services", title: "Modernization, Architecture & Performance", path: "/services/modernization" },
  { group: "Services", title: "Cloud, DevOps & Scalable Platforms", path: "/services/cloud-devops" },
  { group: "Services", title: "Data, Analytics & Business Automation", path: "/services/data-automation" },
  { group: "Services", title: "APIs, Integrations, Reliability & Security", path: "/services/apis-integration" },
  { group: "Services", title: "AI Solutions & Technical Consulting", path: "/services/ai-consulting" },
  { group: "Pages", title: "Solutions", path: "/solutions" },
  { group: "Pages", title: "Case Studies", path: "/case-studies" },
  { group: "Pages", title: "About", path: "/about" },
  { group: "Pages", title: "Contact", path: "/contact" },
];

export interface SeoCheck {
  label: string;
  ok: boolean;
  /** Shown when the check fails. */
  fix: string;
}

const MIN_WORDS = 600;

/** A lightweight on-page SEO checklist — the basics Google and link previews rely on. */
export function seoChecks(post: Post): SeoCheck[] {
  const title = post.title.trim();
  const description = (post.description || post.excerpt).trim();
  const primary = post.keywords[0]?.toLowerCase() ?? "";
  const h2s = (post.body.match(/^##\s+\S/gm) ?? []).length;
  const images = [...post.body.matchAll(/!\[([^\]]*)\]\(/g)];
  const withoutImages = post.body.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  const internalLinks = (withoutImages.match(/\]\((\/|https:\/\/(www\.)?theerrv\.com)/g) ?? []).length;
  const words = wordCount(post.body);

  return [
    {
      label: "Title is 30–60 characters",
      ok: title.length >= 30 && title.length <= 60,
      fix: title.length < 30 ? "Make the title more descriptive." : "Shorten the title so Google doesn't cut it off.",
    },
    {
      label: "Meta description is 70–160 characters",
      ok: description.length >= 70 && description.length <= LIMITS.description,
      fix: "Write a description of 70–160 characters (or a longer excerpt).",
    },
    {
      label: "Main keyword appears in the title",
      ok: !!primary && title.toLowerCase().includes(primary),
      fix: primary ? `Work "${post.keywords[0]}" into the title.` : "Add a keyword — the first one counts as the main keyword.",
    },
    {
      label: "Main keyword appears in the first paragraph",
      ok: !!primary && post.body.trim().split(/\n\s*\n/)[0].toLowerCase().includes(primary),
      fix: "Mention the main keyword early in the article.",
    },
    {
      label: "At least 2 section headings",
      ok: h2s >= 2,
      fix: "Break the article up with ## headings.",
    },
    {
      label: `At least ${MIN_WORDS} words`,
      ok: words >= MIN_WORDS,
      fix: `${MIN_WORDS - words} more words to go — longer, useful posts rank better.`,
    },
    {
      label: "Links to another page on the site",
      ok: internalLinks > 0,
      fix: "Use the link button to point to a related post or service.",
    },
    {
      label: "Every image has a description",
      ok: images.every((m) => m[1].trim() !== ""),
      fix: "Fill in the text between ![ and ] for each image.",
    },
    {
      label: "Has a cover image",
      ok: !!post.cover,
      fix: "Upload a cover — it's also the image shown when the link is shared.",
    },
  ];
}
