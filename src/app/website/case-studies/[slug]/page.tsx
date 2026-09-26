"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageBackground } from "@/components/page-background";
import { RequireWebsiteAccess } from "@/components/require-website-access";
import { PostEditor } from "@/components/website/post-editor";
import { usePost } from "@/lib/website-api";

function EditCaseStudy() {
  const { slug } = useParams<{ slug: string }>();
  const { post, error } = usePost(slug);

  if (error || post === undefined) {
    return (
      <PageBackground>
        <div className="flex flex-1 items-center justify-center px-4 text-center text-white/50">
          {error ?? "Loading from the website repo…"}
        </div>
      </PageBackground>
    );
  }

  if (!post || post.kind !== "case-study") {
    return (
      <PageBackground>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-white/60">This post doesn&apos;t exist.</p>
          <Link href="/website/case-studies" className="text-orange-400 hover:underline">
            Back to the list
          </Link>
        </div>
      </PageBackground>
    );
  }

  return <PostEditor key={slug} initial={post} isNew={false} />;
}

export default function EditCaseStudyPage() {
  return (
    <RequireWebsiteAccess>
      <EditCaseStudy />
    </RequireWebsiteAccess>
  );
}
