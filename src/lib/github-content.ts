import "server-only";

/**
 * Thin client for the GitHub REST API, scoped to the website repo (theerrv-final).
 * Server-only: the token can write to the live site. Env:
 *   GITHUB_CONTENT_TOKEN   — fine-grained token, Contents: read & write on the website repo only
 *   GITHUB_CONTENT_REPO    — owner/name, defaults to THEERRV-ORG/theerrv-final
 *   GITHUB_CONTENT_BRANCH  — the branch that deploys to production, defaults to dev
 */

// Overridable for GitHub Enterprise or a local test double.
const API = process.env.GITHUB_API_URL || "https://api.github.com";

export const CONTENT_DIR = "src/content/insights";
export const IMAGE_DIR = "public/insights";
/** Drafts and scheduled posts each live on their own branch until they go live. */
export const DRAFT_BRANCH_PREFIX = "content/";

export function repo() {
  return process.env.GITHUB_CONTENT_REPO || "THEERRV-ORG/theerrv-final";
}

export function liveBranch() {
  return process.env.GITHUB_CONTENT_BRANCH || "dev";
}

export function draftBranch(slug: string) {
  return `${DRAFT_BRANCH_PREFIX}${slug}`;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new GitHubError("GITHUB_CONTENT_TOKEN is not configured", 500);
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GitHubError(`GitHub ${init.method ?? "GET"} ${path} → ${res.status} ${detail.slice(0, 200)}`, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const enc = encodeURIComponent;

/** Head commit sha of a branch, or null when the branch doesn't exist. */
export async function branchSha(branch: string): Promise<string | null> {
  try {
    const ref = await gh<{ object: { sha: string } }>(`/repos/${repo()}/git/ref/heads/${branch}`);
    return ref.object.sha;
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null;
    throw err;
  }
}

export async function createBranch(branch: string, fromSha: string) {
  await gh(`/repos/${repo()}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  });
}

export async function deleteBranch(branch: string) {
  try {
    await gh(`/repos/${repo()}/git/refs/heads/${branch}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof GitHubError && (err.status === 404 || err.status === 422))) throw err;
  }
}

/** Names of every draft branch (content/<slug>). */
export async function listDraftBranches(): Promise<string[]> {
  const refs = await gh<{ ref: string }[]>(
    `/repos/${repo()}/git/matching-refs/heads/${DRAFT_BRANCH_PREFIX}`,
  );
  return refs.map((r) => r.ref.replace("refs/heads/", ""));
}

interface ContentFile {
  sha: string;
  text: string;
}

/** A text file on a branch, or null when it isn't there. */
export async function readTextFile(branch: string, path: string): Promise<ContentFile | null> {
  try {
    const file = await gh<{ sha: string; content: string; encoding: string }>(
      `/repos/${repo()}/contents/${path}?ref=${enc(branch)}`,
    );
    return { sha: file.sha, text: Buffer.from(file.content, "base64").toString("utf8") };
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null;
    throw err;
  }
}

/** Raw bytes of a file on a branch (any size), or null when it isn't there. */
export async function readRawFile(branch: string, path: string): Promise<Buffer | null> {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new GitHubError("GITHUB_CONTENT_TOKEN is not configured", 500);
  const res = await fetch(`${API}/repos/${repo()}/contents/${path}?ref=${enc(branch)}`, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(`GitHub raw ${path} → ${res.status}`, res.status);
  return Buffer.from(await res.arrayBuffer());
}

/** Blob sha of any file on a branch (without downloading it), or null. */
export async function fileSha(branch: string, path: string): Promise<string | null> {
  const dir = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const listing = await listDir(branch, dir);
  return listing.find((f) => f.name === name)?.sha ?? null;
}

export async function listDir(branch: string, dir: string): Promise<{ name: string; path: string; sha: string }[]> {
  try {
    return await gh<{ name: string; path: string; sha: string; type: string }[]>(
      `/repos/${repo()}/contents/${dir}?ref=${enc(branch)}`,
    ).then((items) => items.filter((i) => i.type === "file"));
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return [];
    throw err;
  }
}

/** Uploads bytes as a git blob (not yet in any commit) and returns its sha. */
export async function createBlob(bytes: Buffer): Promise<string> {
  const blob = await gh<{ sha: string }>(`/repos/${repo()}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: bytes.toString("base64"), encoding: "base64" }),
  });
  return blob.sha;
}

export type FileChange =
  | { path: string; text: string }
  | { path: string; blobSha: string }
  | { path: string; delete: true };

export interface CommitAuthor {
  name: string;
  email: string;
}

/**
 * Applies every change in ONE commit on top of the branch head, so a publish triggers a single
 * site rebuild. Fails (rather than overwriting) if someone pushed to the branch in between.
 */
export async function commitFiles(branch: string, message: string, author: CommitAuthor, changes: FileChange[]) {
  const head = await branchSha(branch);
  if (!head) throw new GitHubError(`Branch ${branch} does not exist`, 404);
  const commit = await gh<{ tree: { sha: string } }>(`/repos/${repo()}/git/commits/${head}`);

  const tree = changes.map((c) =>
    "delete" in c
      ? { path: c.path, mode: "100644", type: "blob", sha: null }
      : "blobSha" in c
        ? { path: c.path, mode: "100644", type: "blob", sha: c.blobSha }
        : { path: c.path, mode: "100644", type: "blob", content: c.text },
  );
  const newTree = await gh<{ sha: string }>(`/repos/${repo()}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree }),
  });
  const newCommit = await gh<{ sha: string }>(`/repos/${repo()}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [head],
      author: { ...author, date: new Date().toISOString() },
    }),
  });
  await gh(`/repos/${repo()}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
  return newCommit.sha;
}

/**
 * The Vercel preview URL for a branch's latest commit, when the Vercel GitHub integration has
 * reported one. Null while it's still building or when there is none.
 */
export async function previewUrl(branch: string): Promise<string | null> {
  const deployments = await gh<{ id: number }[]>(
    `/repos/${repo()}/deployments?ref=${enc(branch)}&per_page=1`,
  );
  if (!deployments[0]) return null;
  const statuses = await gh<{ state: string; environment_url?: string; target_url?: string }[]>(
    `/repos/${repo()}/deployments/${deployments[0].id}/statuses?per_page=5`,
  );
  const ready = statuses.find((s) => s.state === "success");
  return ready?.environment_url || ready?.target_url || null;
}
