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
export function toMarkdownFile(post: Post) {
  const lines: [string, string][] = [
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
