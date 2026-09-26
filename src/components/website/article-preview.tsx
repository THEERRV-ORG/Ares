"use client";

import { useMemo } from "react";
import { readTime, renderPostHtml, SITE_URL, type Post } from "@/lib/website-posts";
import "./article-preview.css";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Images picked in the editor but not on the site yet: site path → local blob URL. */
export type LocalImages = Record<string, string>;

/** Resolves an image path to something the browser can show: a local upload, or the live site. */
export function coverSrc(path: string, local: LocalImages = {}) {
  if (!path) return "";
  if (local[path]) return local[path];
  return path.startsWith("/") ? `${SITE_URL}${path}` : path;
}

/**
 * The post as it will look on theerrv.com. The HTML comes from our own editor's markdown,
 * rendered the same way the website renders it — it is only ever shown to the signed-in
 * author who typed it.
 */
export function ArticlePreview({ post, localImages = {} }: { post: Post; localImages?: LocalImages }) {
  const html = useMemo(
    () =>
      renderPostHtml(post.body).replace(
        /(<img[^>]*\ssrc=")([^"]+)"/g,
        (_, start: string, src: string) => `${start}${coverSrc(src, localImages)}"`,
      ),
    [post.body, localImages],
  );
  const cover = coverSrc(post.cover, localImages);
  const logo = coverSrc(post.logo, localImages);
  const gallery = post.gallery.filter((g) => g.src);
  const isCaseStudy = post.kind === "case-study";
  const results = post.results.filter((r) => r.value || r.label);

  return (
    <article className="theerrv-article min-h-full rounded-xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl">
        {isCaseStudy && logo && (
          // eslint-disable-next-line @next/next/no-img-element -- blob URL or remote site path
          <img src={logo} alt="" className="mb-5 h-10 w-auto max-w-40 object-contain" />
        )}
        <p className="ta-eyebrow">
          {isCaseStudy ? post.client || "Client name" : post.category || "Category"}
        </p>
        <h1 className="ta-title mt-3">{post.title || "Your title appears here"}</h1>
        {post.excerpt && <p className="ta-excerpt mt-4">{post.excerpt}</p>}
        <p className="mt-5 text-sm text-white/40">
          {post.author || "Theerrv Technologies"}
          {post.authorRole && ` · ${post.authorRole}`} · {formatDate(post.date)} · {readTime(post.body)}
        </p>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- blob URLs and remote site paths
          <img src={cover} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
        )}

        {isCaseStudy && results.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((r, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-2xl font-bold text-[#ff5a4f]">{r.value}</p>
                <p className="mt-1 text-sm text-white/60">{r.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="ta-prose mt-10" dangerouslySetInnerHTML={{ __html: html }} />

        {isCaseStudy && gallery.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {gallery.map((g, i) => (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URL or remote site path */}
                <img
                  src={coverSrc(g.src, localImages)}
                  alt={g.caption}
                  className="aspect-[4/3] w-full rounded-xl border border-white/10 object-cover"
                />
                {g.caption && <figcaption className="mt-2 text-sm text-white/50">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {isCaseStudy && post.testimonial && (
          <figure className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <blockquote className="text-lg font-medium text-[#f3f0e8]">
              &ldquo;{post.testimonial}&rdquo;
            </blockquote>
            {post.testimonialBy && (
              <figcaption className="mt-3 text-sm text-white/50">
                {post.testimonialBy}
                {post.testimonialRole && `, ${post.testimonialRole}`}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </article>
  );
}
