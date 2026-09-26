import { withWebsiteUser } from "@/lib/website-route";
import { draftBranch, previewUrl } from "@/lib/github-content";
import { SLUG_PATTERN } from "@/lib/website-posts";

export const runtime = "nodejs";

/** The Vercel preview of a post's draft branch, once Vercel has finished building it. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withWebsiteUser(req, async () => {
    const { slug } = await params;
    if (!SLUG_PATTERN.test(slug)) return Response.json({ url: null });
    const base = await previewUrl(draftBranch(slug));
    return Response.json({ url: base ? `${base.replace(/\/$/, "")}/insights/${slug}` : null });
  });
}
