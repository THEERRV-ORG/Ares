"use client";

import { RequireWebsiteAccess } from "@/components/require-website-access";
import { PostEditor } from "@/components/website/post-editor";
import { emptyPost } from "@/lib/website-posts";

export default function NewCaseStudyPage() {
  return (
    <RequireWebsiteAccess>
      <PostEditor initial={emptyPost("case-study")} isNew />
    </RequireWebsiteAccess>
  );
}
