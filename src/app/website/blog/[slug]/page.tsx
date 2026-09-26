"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageBackground } from "@/components/page-background";
import { RequireWebsiteAccess } from "@/components/require-website-access";
import { PostEditor } from "@/components/website/post-editor";
import { samplePost } from "@/lib/website-posts-sample";

function EditBlog() {
  const { slug } = useParams<{ slug: string }>();
  const post = samplePost("blog", slug);

  if (!post) {
    return (
      <PageBackground>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-white/60">This post doesn&apos;t exist.</p>
          <Link href="/website/blog" className="text-orange-400 hover:underline">
            Back to the list
          </Link>
        </div>
      </PageBackground>
    );
  }

  return <PostEditor key={slug} initial={post} isNew={false} />;
}

export default function EditBlogPage() {
  return (
    <RequireWebsiteAccess>
      <EditBlog />
    </RequireWebsiteAccess>
  );
}
