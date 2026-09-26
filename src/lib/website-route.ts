import "server-only";
import { GitHubError } from "@/lib/github-content";
import { AuthError, requireWebsiteUser, type WebsiteUser } from "@/lib/website-auth";
import { PublishError } from "@/lib/website-publishing";

/**
 * Wraps a website publishing route: checks the caller has website access, then turns known
 * failures into clean JSON errors the editor can show.
 */
export async function withWebsiteUser(req: Request, handler: (user: WebsiteUser) => Promise<Response>) {
  try {
    const user = await requireWebsiteUser(req);
    return await handler(user);
  } catch (err) {
    return errorResponse(err);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AuthError || err instanceof PublishError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof GitHubError) {
    console.error(err);
    const conflict = err.status === 422 || err.status === 409;
    return Response.json(
      {
        error: conflict
          ? "The website changed while saving — reload and try again."
          : "Couldn't reach the website repo. Try again in a minute.",
      },
      { status: conflict ? 409 : 502 },
    );
  }
  console.error(err);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}

export const commitAuthor = (user: WebsiteUser) => ({
  name: user.name || user.email,
  email: user.email || "noreply@theerrv.com",
});
