import "server-only";
import {
  CONTENT_DIR,
  IMAGE_DIR,
  branchSha,
  commitFiles,
  createBranch,
  deleteBranch,
  draftBranch,
  listDir,
  listDraftBranches,
  liveBranch,
  readTextFile,
  type CommitAuthor,
  type FileChange,
} from "@/lib/github-content";
import {
  LIMITS,
  SLUG_PATTERN,
  fromMarkdownFile,
  referencedImages,
  toMarkdownFile,
  type Post,
} from "@/lib/website-posts";

/**
 * Publishing model for theerrv.com content (all in the theerrv-final repo):
 *   - Live posts:      src/content/insights/<slug>.md on the live branch (dev). Images in public/insights.
 *   - Drafts/scheduled: the same file on a branch of their own, content/<slug>, with a
 *                      `status: draft|scheduled` line. Vercel builds each branch as a preview.
 *   - Publish:         one commit onto the live branch (post + any new images), then the draft
 *                      branch is deleted. Editing a live post and saving a draft keeps the live
 *                      version untouched until the next publish.
 */

export class PublishError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type SaveAction = "draft" | "schedule" | "publish";

const IMAGE_PATH = /^\/insights\/[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g|svg)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const mdPath = (slug: string) => `${CONTENT_DIR}/${slug}.md`;
/** "/insights/x.webp" (site path) → "public/insights/x.webp" (repo path). */
const repoImagePath = (sitePath: string) => `${IMAGE_DIR}/${sitePath.slice("/insights/".length)}`;

/** Today's date in India, where the team is — scheduled posts go live on this calendar day. */
export function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function readPost(branch: string, slug: string) {
  const file = await readTextFile(branch, mdPath(slug));
  return file ? fromMarkdownFile(file.text, slug) : null;
}

/** Every post: live ones plus drafts and scheduled ones waiting on their branches. */
export async function listPosts(): Promise<Post[]> {
  const [liveFiles, branches] = await Promise.all([listDir(liveBranch(), CONTENT_DIR), listDraftBranches()]);

  const live = await Promise.all(
    liveFiles
      .filter((f) => f.name.endsWith(".md"))
      .map((f) => readPost(liveBranch(), f.name.replace(/\.md$/, ""))),
  );
  const bySlug = new Map<string, Post>();
  for (const entry of live) if (entry) bySlug.set(entry.post.slug, entry.post);

  const drafts = await Promise.all(
    branches.map((b) => {
      const slug = b.slice(draftBranch("").length);
      return SLUG_PATTERN.test(slug) ? readPost(b, slug) : Promise.resolve(null);
    }),
  );
  for (const entry of drafts) {
    if (!entry) continue;
    const existing = bySlug.get(entry.post.slug);
    if (existing) existing.hasDraftChanges = true;
    else bySlug.set(entry.post.slug, entry.post);
  }
  return [...bySlug.values()];
}

/** One post for editing: the newest version (a saved draft wins over the live file). */
export async function getPost(slug: string): Promise<Post | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const [live, draft] = await Promise.all([readPost(liveBranch(), slug), readPost(draftBranch(slug), slug)]);
  if (draft && live) return { ...draft.post, status: "Published", hasDraftChanges: true };
  return draft?.post ?? live?.post ?? null;
}

function validate(post: Post, action: SaveAction) {
  const problems: string[] = [];
  if (!SLUG_PATTERN.test(post.slug) || post.slug.length > 80) problems.push("a valid URL slug");
  if (!post.title.trim() || post.title.length > 200) problems.push("a title");
  if (!DATE.test(post.date)) problems.push("a date");
  if (post.excerpt.length > LIMITS.excerpt * 2) problems.push("a shorter excerpt");
  if (action !== "draft") {
    if (!post.excerpt.trim()) problems.push("an excerpt");
    if (!post.body.trim()) problems.push("a body");
    if (post.kind === "blog" && !post.category.trim()) problems.push("a category");
    if (post.kind === "case-study" && !post.client.trim()) problems.push("a client");
    if (post.kind === "case-study" && !post.clientApproved) problems.push("the client's approval");
  }
  if (problems.length) throw new PublishError(`Needs ${problems.join(", ")}.`, 400);
}

/**
 * Commit changes for image paths the post references. New uploads arrive as blob shas;
 * images uploaded by an earlier draft save are copied from the draft branch by blob sha
 * (no re-upload). Returns an error if a referenced image can't be found anywhere.
 */
async function imageChanges(post: Post, uploads: Record<string, string>, targetBranch: string, sourceBranches: string[]) {
  const referenced = referencedImages(post);
  const [target, ...sources] = await Promise.all(
    [targetBranch, ...sourceBranches].map((b) => listDir(b, IMAGE_DIR)),
  );
  const onTarget = new Set(target.map((f) => f.path));

  const changes: FileChange[] = [];
  for (const sitePath of referenced) {
    if (!IMAGE_PATH.test(sitePath)) continue;
    const path = repoImagePath(sitePath);
    const uploaded = uploads[sitePath];
    if (uploaded) {
      changes.push({ path, blobSha: uploaded });
      continue;
    }
    if (onTarget.has(path)) continue;
    const found = sources.flat().find((f) => f.path === path);
    if (!found) throw new PublishError(`Image ${sitePath} is missing — upload it again.`, 400);
    changes.push({ path, blobSha: found.sha });
  }
  return changes;
}

/** Adds a permanent redirect old → new to vercel.json, so shared links survive a slug change. */
async function redirectChange(fromSlug: string, toSlug: string): Promise<FileChange | null> {
  const file = await readTextFile(liveBranch(), "vercel.json");
  if (!file) return null;
  const config = JSON.parse(file.text) as { redirects?: { source: string; destination: string; permanent: boolean }[] };
  const from = `/insights/${fromSlug}`;
  const to = `/insights/${toSlug}`;
  const redirects = (config.redirects ?? [])
    // Chains collapse: anything that pointed at the old URL now points at the new one.
    .map((r) => (r.destination === from ? { ...r, destination: to } : r))
    .filter((r) => r.source !== from && r.source !== to);
  redirects.push({ source: from, destination: to, permanent: true });
  return { path: "vercel.json", text: `${JSON.stringify({ ...config, redirects }, null, 2)}\n` };
}

async function slugTaken(slug: string) {
  const [live, draft] = await Promise.all([readTextFile(liveBranch(), mdPath(slug)), branchSha(draftBranch(slug))]);
  return Boolean(live || draft);
}

const kindLabel = (post: Post) => (post.kind === "case-study" ? "case study" : "blog post");

export async function savePost(
  author: CommitAuthor,
  post: Post,
  action: SaveAction,
  uploads: Record<string, string>,
  previousSlug: string | null,
) {
  validate(post, action);
  const renamed = previousSlug !== null && previousSlug !== post.slug;
  if ((previousSlug === null || renamed) && (await slugTaken(post.slug))) {
    throw new PublishError(`Another post already uses the URL /insights/${post.slug}.`, 409);
  }

  const oldSlug = renamed ? previousSlug : null;
  const draftSources = [draftBranch(post.slug), ...(oldSlug ? [draftBranch(oldSlug)] : [])];

  if (action === "draft" || action === "schedule") {
    const branch = draftBranch(post.slug);
    const isNewBranch = !(await branchSha(branch));
    // A renamed draft starts from its old branch so earlier image uploads come along.
    const baseBranch = oldSlug && (await branchSha(draftBranch(oldSlug))) ? draftBranch(oldSlug) : liveBranch();

    // Work out every change BEFORE creating the branch, so a failed first save (say, a
    // missing image) doesn't leave an empty branch behind that then blocks the slug.
    const changes: FileChange[] = [
      { path: mdPath(post.slug), text: toMarkdownFile(post, action === "schedule" ? "scheduled" : "draft") },
      ...(await imageChanges(
        post,
        uploads,
        isNewBranch ? baseBranch : branch,
        oldSlug ? [draftBranch(oldSlug), liveBranch()] : [liveBranch()],
      )),
    ];
    if (oldSlug) changes.push({ path: mdPath(oldSlug), delete: true });

    if (isNewBranch) {
      const base = await branchSha(baseBranch);
      if (!base) throw new PublishError(`Branch ${liveBranch()} not found in the website repo.`, 500);
      await createBranch(branch, base);
    }
    try {
      await commitFiles(
        branch,
        `${action === "schedule" ? `Schedule for ${post.date}` : "Save draft"}: ${post.title}`,
        author,
        // Deleting a file the branch doesn't have is an error; only delete what exists.
        await withoutMissingDeletes(branch, changes),
      );
    } catch (err) {
      if (isNewBranch) await deleteBranch(branch).catch(() => {});
      throw err;
    }
    if (oldSlug && !(await readTextFile(liveBranch(), mdPath(oldSlug)))) await deleteBranch(draftBranch(oldSlug));
    return { status: action === "schedule" ? ("Scheduled" as const) : ("Draft" as const) };
  }

  // Publish: everything lands on the live branch in a single commit.
  const existing = await Promise.all(draftSources.map((b) => branchSha(b)));
  const sources = draftSources.filter((_, i) => existing[i]);
  const changes: FileChange[] = [
    { path: mdPath(post.slug), text: toMarkdownFile({ ...post, status: "Published" }) },
    ...(await imageChanges(post, uploads, liveBranch(), sources)),
  ];
  if (oldSlug && (await readTextFile(liveBranch(), mdPath(oldSlug)))) {
    changes.push({ path: mdPath(oldSlug), delete: true });
    const redirect = await redirectChange(oldSlug, post.slug);
    if (redirect) changes.push(redirect);
  }
  const verb = previousSlug && !renamed && (await readTextFile(liveBranch(), mdPath(post.slug))) ? "Update" : "Publish";
  await commitFiles(liveBranch(), `${verb} ${kindLabel(post)}: ${post.title}`, author, changes);
  await Promise.all(sources.map((b) => deleteBranch(b)));
  return { status: "Published" as const };
}

async function withoutMissingDeletes(branch: string, changes: FileChange[]) {
  const deletes = changes.filter((c) => "delete" in c);
  if (!deletes.length) return changes;
  const present = await Promise.all(deletes.map((c) => readTextFile(branch, c.path)));
  const missing = new Set(deletes.filter((_, i) => !present[i]).map((c) => c.path));
  return changes.filter((c) => !("delete" in c && missing.has(c.path)));
}

/** Takes a live post off the site and keeps it (or its newer draft) as a draft. */
export async function unpublishPost(author: CommitAuthor, slug: string) {
  const live = await readTextFile(liveBranch(), mdPath(slug));
  if (!live) throw new PublishError("This post isn't live.", 404);
  const branch = draftBranch(slug);

  if (!(await branchSha(branch))) {
    const base = await branchSha(liveBranch());
    await createBranch(branch, base!);
  }
  const draft = await readPost(branch, slug);
  const post = draft?.post ?? fromMarkdownFile(live.text, slug).post;
  // Keep the draft first, then remove the live file — so nothing is lost if the second step fails.
  await commitFiles(branch, `Unpublish (kept as draft): ${post.title}`, author, [
    { path: mdPath(slug), text: toMarkdownFile(post, "draft") },
  ]);
  await commitFiles(liveBranch(), `Unpublish ${kindLabel(post)}: ${post.title}`, author, [
    { path: mdPath(slug), delete: true },
  ]);
}

/** Removes a post everywhere: its live file, the images only it uses, and any draft branch. */
export async function deletePost(author: CommitAuthor, slug: string) {
  if (!SLUG_PATTERN.test(slug)) throw new PublishError("Invalid post.", 400);
  const live = await readTextFile(liveBranch(), mdPath(slug));
  if (live) {
    const post = fromMarkdownFile(live.text, slug).post;
    // Only images named after this post are removed — shared artwork is never touched.
    const ownImages = (await listDir(liveBranch(), IMAGE_DIR)).filter((f) => f.name.startsWith(`${slug}-`));
    await commitFiles(liveBranch(), `Delete ${kindLabel(post)}: ${post.title}`, author, [
      { path: mdPath(slug), delete: true },
      ...ownImages.map((f) => ({ path: f.path, delete: true as const })),
    ]);
  } else if (!(await branchSha(draftBranch(slug)))) {
    throw new PublishError("This post doesn't exist.", 404);
  }
  await deleteBranch(draftBranch(slug));
}

const SCHEDULER: CommitAuthor = { name: "Ares Scheduler", email: "noreply@theerrv.com" };

/** Publishes every scheduled post whose date has arrived. Run daily. */
export async function publishDuePosts() {
  const today = todayIST();
  const published: string[] = [];
  const failed: { slug: string; error: string }[] = [];
  for (const branch of await listDraftBranches()) {
    const slug = branch.slice(draftBranch("").length);
    if (!SLUG_PATTERN.test(slug)) continue;
    const entry = await readPost(branch, slug);
    if (entry?.status !== "scheduled" || entry.post.date > today) continue;
    try {
      await savePost(SCHEDULER, entry.post, "publish", {}, slug);
      published.push(slug);
    } catch (err) {
      failed.push({ slug, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { today, published, failed };
}
