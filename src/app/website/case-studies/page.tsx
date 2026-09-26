"use client";

import { RequireWebsiteAccess } from "@/components/require-website-access";
import { PostList } from "@/components/website/post-list";

export default function CaseStudyListPage() {
  return (
    <RequireWebsiteAccess>
      <PostList kind="case-study" />
    </RequireWebsiteAccess>
  );
}
