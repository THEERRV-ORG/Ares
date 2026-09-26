"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Post } from "@/lib/website-posts";

/** Calls the website publishing API as the signed-in member. Throws with the API's message. */
export async function websiteFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("You're signed out — refresh the page.");
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** All posts from the website repo — live, drafts and scheduled. */
export function usePosts() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    websiteFetch<{ posts: Post[] }>("/api/website/posts")
      .then((d) => {
        if (!cancelled) {
          setPosts(d.posts);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { posts, error, reload };
}

/** Loads one post for the editor. undefined = loading, null = not found. */
export function usePost(slug: string) {
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    websiteFetch<{ post: Post }>(`/api/website/posts/${encodeURIComponent(slug)}`)
      .then((d) => !cancelled && setPost(d.post))
      .catch((err: Error) => {
        if (cancelled) return;
        if (/doesn't exist/.test(err.message)) setPost(null);
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { post, error };
}

/**
 * Resizes an image to at most `maxWidth` px wide and re-encodes it as WebP in the browser,
 * so uploads stay small and the site only ever serves WebP.
 */
export async function toWebp(src: string, maxWidth = 1600): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || maxWidth) * scale));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || maxWidth * 0.5625) * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") throw new Error("This browser can't convert images to WebP.");
  return blob;
}

/** Uploads a WebP image; returns the blob sha the next save should reference. */
export async function uploadImage(webp: Blob) {
  const { sha } = await websiteFetch<{ sha: string }>("/api/website/images", {
    method: "POST",
    headers: { "Content-Type": "image/webp" },
    body: webp,
  });
  return sha;
}

/**
 * Fetches a post's image through the API (as a local blob URL) — for images saved on a draft
 * branch that the live site doesn't have yet. Returns null if it can't be found.
 */
export async function fetchDraftImage(slug: string, sitePath: string): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const res = await fetch(
    `/api/website/posts/${encodeURIComponent(slug)}/image?path=${encodeURIComponent(sitePath)}`,
    { headers: { Authorization: `Bearer ${await user.getIdToken()}` } },
  );
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}
