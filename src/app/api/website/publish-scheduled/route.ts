import { errorResponse } from "@/lib/website-route";
import { publishDuePosts } from "@/lib/website-publishing";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Publishes scheduled posts whose date has arrived. Called daily by
 * .github/workflows/website-scheduled.yml with the x-cron-secret header (WEBSITE_CRON_SECRET).
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.WEBSITE_CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await publishDuePosts();
    return Response.json(result, { status: result.failed.length ? 207 : 200 });
  } catch (err) {
    return errorResponse(err);
  }
}
