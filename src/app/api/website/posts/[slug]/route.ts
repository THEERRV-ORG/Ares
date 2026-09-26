import { commitAuthor, withWebsiteUser } from "@/lib/website-route";
import { deletePost, getPost, PublishError } from "@/lib/website-publishing";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Context) {
  return withWebsiteUser(req, async () => {
    const post = await getPost((await params).slug);
    if (!post) throw new PublishError("This post doesn't exist.", 404);
    return Response.json({ post });
  });
}

export async function DELETE(req: Request, { params }: Context) {
  return withWebsiteUser(req, async (user) => {
    await deletePost(commitAuthor(user), (await params).slug);
    return Response.json({ ok: true });
  });
}
