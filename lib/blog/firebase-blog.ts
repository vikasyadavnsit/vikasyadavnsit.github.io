import { db } from "@/lib/firebase";
import {
  ref as dbRef, push, set, get, update, onValue, off, remove, increment,
} from "firebase/database";
import type { BlogPost, BlogPostDraft } from "./types";

const POSTS = "blogs/posts";

// ── Posts ────────────────────────────────────────────────────────────────
// Cover images / inline images / attachments are stored as base64 data URIs
// directly on the post record (no Firebase Storage, which requires the Blaze plan).

export const createPost = async (data: BlogPostDraft): Promise<string> => {
  const newRef = push(dbRef(db, POSTS));
  const id = newRef.key!;
  const now = Date.now();
  const post: BlogPost = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.published ? now : null,
    viewCount: 0,
  };
  await set(newRef, post);
  return id;
};

export const updatePost = async (
  id: string,
  data: Partial<BlogPost>,
  wasPublished: boolean
): Promise<void> => {
  const patch: Partial<BlogPost> = { ...data, updatedAt: Date.now() };
  if (data.published && !wasPublished) {
    patch.publishedAt = Date.now();
  }
  await update(dbRef(db, `${POSTS}/${id}`), patch);
};

export const deletePost = async (id: string): Promise<void> => {
  await remove(dbRef(db, `${POSTS}/${id}`));
};

export const subscribeToPosts = (
  cb: (posts: BlogPost[]) => void
): (() => void) => {
  const r = dbRef(db, POSTS);
  const listener = onValue(r, (snap) => {
    const data = snap.val();
    if (data) {
      const list = Object.values(data) as BlogPost[];
      list.sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt));
      cb(list);
    } else {
      cb([]);
    }
  });
  return () => off(r, "value", listener);
};

export const getPostBySlugOrId = async (idOrSlug: string): Promise<BlogPost | null> => {
  const directSnap = await get(dbRef(db, `${POSTS}/${idOrSlug}`));
  if (directSnap.exists()) return directSnap.val() as BlogPost;

  const allSnap = await get(dbRef(db, POSTS));
  const data = allSnap.val();
  if (!data) return null;
  const match = Object.values(data as Record<string, BlogPost>).find(
    (p) => p.slug === idOrSlug
  );
  return match ?? null;
};

export const incrementViewCount = async (postId: string): Promise<void> => {
  await update(dbRef(db, `${POSTS}/${postId}`), { viewCount: increment(1) });
};

// Allocates a Firebase push key client-side (no network write) — used to build a unique slug before the first save.
export const newPostId = (): string => push(dbRef(db, POSTS)).key!;
