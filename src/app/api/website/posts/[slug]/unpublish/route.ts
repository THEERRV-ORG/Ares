import { commitAuthor, withWebsiteUser } from "@/lib/website-route";
import { unpublishPost } from "@/lib/website-publishing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withWebsiteUser(req, async (user) => {
    await unpublishPost(commitAuthor(user), (await params).slug);
    return Response.json({ status: "Draft" });
  });
}
