"use client";

import { RequireWebsiteAccess } from "@/components/require-website-access";
import { PostList } from "@/components/website/post-list";

export default function BlogListPage() {
  return (
    <RequireWebsiteAccess>
      <PostList kind="blog" />
    </RequireWebsiteAccess>
  );
}
