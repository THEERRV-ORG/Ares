import { emptyPost, type Post, type PostKind } from "@/lib/website-posts";

/**
 * PLACEHOLDER — the real list will be read from theerrv-final/src/content/insights on GitHub.
 * Until that is wired up, the editor UI runs on this snapshot of the live articles
 * (metadata as published; bodies shortened).
 */

function blog(fields: Partial<Post> & Pick<Post, "slug" | "title">): Post {
  return {
    ...emptyPost("blog"),
    status: "Published",
    body: `${fields.excerpt ?? ""}\n\n## Full article\n\nThe full article body lives in the website repo and will load here once publishing is connected.\n`,
    ...fields,
  };
}

const SAMPLE_POSTS: Post[] = [
  blog({
    slug: "signs-your-business-has-outgrown-spreadsheets",
    title: "7 signs your business has outgrown spreadsheets",
    category: "Operations",
    date: "2026-09-08",
    cover: "/insights/spreadsheets.png",
    excerpt:
      "Spreadsheets run more businesses than any software ever will — until they quietly become the bottleneck. Here's how to tell when it's time to move to a real system.",
    description:
      "Seven clear signs your business has outgrown spreadsheets — and what to replace them with before they cost you time, errors, and growth.",
    keywords: ["replace spreadsheets with software", "when to move off excel"],
  }),
  blog({
    slug: "modernize-legacy-app-without-rewrite",
    title: "How to modernize a legacy app without a risky rewrite",
    category: "Modernization",
    date: "2026-09-06",
    cover: "/insights/modernize.png",
    excerpt:
      "The full rewrite is the most tempting and most dangerous way to fix old software. Here's the safer path — modernizing in place, one controlled step at a time.",
    description:
      "A practical guide to modernizing legacy applications without a full rewrite — the strangler approach, what to fix first, and how to reduce risk.",
    keywords: ["legacy application modernization", "strangler fig pattern"],
  }),
  blog({
    slug: "what-custom-software-costs-in-india",
    title: "What custom software really costs in India — and what drives the price",
    category: "Cost & Budgeting",
    date: "2026-09-05",
    featured: true,
    cover: "/insights/cost.png",
    excerpt:
      'The honest version of the answer every business wants before they call a developer — what you\'re actually paying for, and why two quotes for "the same app" can differ 5x.',
    description:
      "A candid breakdown of what custom software costs in India, the factors that move the price, and how to budget without overpaying or underscoping.",
    keywords: ["custom software cost india", "software development pricing"],
  }),
  blog({
    slug: "build-vs-buy-custom-software",
    title: "Build vs. buy: when off-the-shelf software starts costing you more",
    category: "Decisions",
    date: "2026-09-03",
    cover: "/insights/buildbuy.png",
    excerpt:
      "Custom software isn't always the answer — and a partner who tells you when to just buy a tool is worth more than one who bills you to rebuild it. A practical way to decide.",
    description:
      "A clear framework for deciding whether to build custom software or buy an off-the-shelf tool — the questions that actually matter, and the hidden costs of each.",
    keywords: ["build vs buy software", "saas vs custom"],
  }),
  blog({
    slug: "practical-ai-for-small-business",
    title: "Practical AI for small businesses — where it helps, where it's hype",
    category: "AI",
    date: "2026-09-02",
    cover: "/insights/ai.png",
    excerpt:
      "You don't need an AI strategy. You need one or two places where AI quietly saves real hours. An honest guide to where it pays off for a small business — and where it doesn't.",
    description:
      "An honest, practical guide to AI for small businesses — real use cases that save time, plus the hype to ignore and how to adopt it safely.",
    keywords: ["ai for small business", "practical ai use cases"],
  }),
  blog({
    slug: "software-development-company-tamil-nadu",
    title: "How to choose a software development company in Tamil Nadu",
    category: "Guides",
    date: "2026-08-30",
    cover: "/insights/local.png",
    excerpt:
      "A practical guide to picking a software partner in Tamil Nadu — what to look for, the questions that separate good teams from cheap ones, and why local can beat offshore.",
    description:
      "How to choose a software development company in Tamil Nadu — what to evaluate, questions to ask, and how a local partner compares to offshore agencies.",
    keywords: ["software development company tamil nadu", "software company vellore"],
  }),
  blog({
    slug: "designing-a-one-tap-donation-flow",
    title: "Designing a one-tap donation flow — a small UX study",
    category: "Craft",
    date: "2026-08-28",
    cover: "/insights/donation.png",
    excerpt:
      "Most forms ask for too much and people leave. Here's how we cut a donation flow down to almost nothing — and why the same thinking applies to any conversion form.",
    description:
      "A UX case study on designing a friction-free, one-tap donation flow — the decisions that reduce drop-off, applicable to any form that needs conversions.",
    keywords: ["donation form ux", "reduce form abandonment"],
  }),
  blog({
    slug: "automate-manual-reporting-pipelines",
    title: "Turning manual reporting into automated pipelines",
    category: "Data & Automation",
    date: "2026-08-25",
    cover: "/insights/pipeline.png",
    excerpt:
      "If someone on your team spends the first morning of every month building the same report by hand, you're paying for work a pipeline could do in seconds. Here's how that shift works.",
    description:
      "How to replace manual, copy-paste reporting with automated data pipelines — what to automate first, how it works, and the payoff in time and accuracy.",
    keywords: ["automate reporting", "data pipeline automation"],
  }),
  blog({
    slug: "react-vs-flutter-for-business-apps",
    title: "React Native vs Flutter for business apps in 2026",
    category: "Decisions",
    status: "Scheduled",
    date: "2026-10-06",
    excerpt: "Both will ship your app. Here's how to pick the one your team can still maintain in three years.",
  }),
  blog({
    slug: "draft-how-we-run-discovery-workshops",
    title: "How we run a two-day discovery workshop",
    category: "Guides",
    status: "Draft",
    date: "2026-09-30",
    excerpt: "What happens in the first 48 hours of a project with us, and why it saves weeks later.",
  }),
  {
    ...emptyPost("case-study"),
    slug: "website-for-social-service-trust-nallathae-nadakkum",
    status: "Published",
    title: "How we built a donation-ready website for a social service trust",
    client: "Nallathae Nadakkum",
    industry: "Non-profit",
    duration: "6 weeks",
    services: ["Website", "Admin dashboard", "Payments"],
    stack: ["React", "Firebase", "Vercel"],
    results: [
      { value: "1 tap", label: "WhatsApp giving" },
      { value: "< 1 s", label: "Page load on 4G" },
      { value: "0 → live", label: "Online donations" },
    ],
    testimonial: "We finally have a place to send people who want to help.",
    testimonialBy: "Trust coordinator",
    testimonialRole: "Nallathae Nadakkum",
    clientApproved: true,
    date: "2026-08-15",
    featured: true,
    excerpt:
      "A trust doing extraordinary work had almost no digital presence. We built a fast, donation-ready platform with an admin dashboard and one-tap WhatsApp giving.",
    description:
      "See how THEERRV built a fast, donation-ready website with an admin dashboard and WhatsApp giving for Nallathae Nadakkum, a social service trust.",
    keywords: ["website for a social service trust", "NGO website development", "donation website"],
    body: `A trust doing extraordinary work had almost no digital presence.

## The challenge

Donors found them only by word of mouth, and there was no simple way to give online.

## What we built

A fast, donation-ready website with an admin dashboard the team updates themselves.

## Results

- ✅ One-tap WhatsApp giving
- ✅ Pages that load in under a second on 4G

> We finally have a place to send people who want to help.
`,
  },
];

export function samplePosts(kind: PostKind) {
  return SAMPLE_POSTS.filter((p) => p.kind === kind);
}

export function samplePost(kind: PostKind, slug: string) {
  return SAMPLE_POSTS.find((p) => p.kind === kind && p.slug === slug) ?? null;
}
