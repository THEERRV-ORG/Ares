import { withWebsiteUser } from "@/lib/website-route";
import { createBlob } from "@/lib/github-content";
import { PublishError } from "@/lib/website-publishing";

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Upload one image (already resized to WebP in the browser) as a git blob. Returns its sha,
 * which the next save references — the image only lands in a commit when the post is saved.
 */
export async function POST(req: Request) {
  return withWebsiteUser(req, async () => {
    if (req.headers.get("content-type") !== "image/webp") {
      throw new PublishError("Images must be uploaded as WebP.", 415);
    }
    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      throw new PublishError("Image must be under 3 MB.", 413);
    }
    // RIFF....WEBP — refuse anything that isn't actually a WebP file.
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
      throw new PublishError("That file isn't a valid WebP image.", 415);
    }
    return Response.json({ sha: await createBlob(bytes) });
  });
}
