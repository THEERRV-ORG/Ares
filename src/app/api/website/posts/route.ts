import { commitAuthor, withWebsiteUser } from "@/lib/website-route";
import { listPosts, PublishError, savePost, type SaveAction } from "@/lib/website-publishing";
import type { Post } from "@/lib/website-posts";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Every blog post and case study — live, draft, and scheduled. */
export async function GET(req: Request) {
  return withWebsiteUser(req, async () => Response.json({ posts: await listPosts() }));
}

const ACTIONS: SaveAction[] = ["draft", "schedule", "publish"];

/**
 * Save a post. Body: { post, action: "draft" | "schedule" | "publish", uploads, previousSlug }.
 * `uploads` maps site image paths (/insights/…) to blob shas from POST /api/website/images;
 * `previousSlug` is the slug it was last saved under (null for a brand-new post).
 */
export async function POST(req: Request) {
  return withWebsiteUser(req, async (user) => {
    const body = (await req.json().catch(() => null)) as {
      post?: Post;
      action?: SaveAction;
      uploads?: Record<string, string>;
      previousSlug?: string | null;
    } | null;
    if (!body?.post || !body.action || !ACTIONS.includes(body.action)) {
      throw new PublishError("Invalid request.", 400);
    }
    const uploads = Object.fromEntries(
      Object.entries(body.uploads ?? {}).filter(
        ([path, sha]) => typeof path === "string" && typeof sha === "string" && /^[0-9a-f]{40}$/.test(sha),
      ),
    );
    const result = await savePost(commitAuthor(user), body.post, body.action, uploads, body.previousSlug ?? null);
    return Response.json(result);
  });
}
