import { withWebsiteUser } from "@/lib/website-route";
import { IMAGE_DIR, draftBranch, liveBranch, readRawFile } from "@/lib/github-content";
import { PublishError } from "@/lib/website-publishing";
import { SLUG_PATTERN } from "@/lib/website-posts";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * Serves one of a post's images from its draft branch (falling back to the live branch), so
 * the editor can show images that aren't on theerrv.com yet. ?path=/insights/<file>
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withWebsiteUser(req, async () => {
    const { slug } = await params;
    const sitePath = new URL(req.url).searchParams.get("path") ?? "";
    const match = /^\/insights\/([a-z0-9][a-z0-9-]*\.(webp|png|jpe?g))$/.exec(sitePath);
    if (!SLUG_PATTERN.test(slug) || !match) throw new PublishError("Invalid image.", 400);

    const repoPath = `${IMAGE_DIR}/${match[1]}`;
    const bytes = (await readRawFile(draftBranch(slug), repoPath)) ?? (await readRawFile(liveBranch(), repoPath));
    if (!bytes) throw new PublishError("Image not found.", 404);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": TYPES[match[2]], "Cache-Control": "private, max-age=300" },
    });
  });
}
