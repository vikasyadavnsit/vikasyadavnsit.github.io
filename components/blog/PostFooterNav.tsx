"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog/types";
import BlogCard from "./BlogCard";

/**
 * Older/newer navigation + related-by-tag posts.
 * `posts` is the full published list sorted newest-first (as subscribeToPosts returns).
 */
export default function PostFooterNav({ posts, current }: { posts: BlogPost[]; current: BlogPost }) {
  const idx = posts.findIndex((p) => p.id === current.id);
  const newer = idx > 0 ? posts[idx - 1] : null;
  const older = idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null;

  const currentTags = new Set(current.tags ?? []);
  const related = posts
    .filter((p) => p.id !== current.id && (p.tags ?? []).some((t) => currentTags.has(t)))
    .slice(0, 3);

  const navCard =
    "group flex-1 min-w-0 flex flex-col gap-1 p-5 rounded-2xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] hover:border-[hsl(var(--blog-accent))] transition-colors";

  return (
    <div className="mt-16 pt-10 border-t border-[hsl(var(--blog-border))]">
      {(older || newer) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {older ? (
            <Link href={`/blogs/post?slug=${older.slug}`} className={navCard}>
              <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-[hsl(var(--blog-muted))]">
                <ArrowLeft className="w-3 h-3" /> Older
              </span>
              <span className="font-semibold text-[hsl(var(--blog-fg))] line-clamp-2 group-hover:text-[hsl(var(--blog-accent))] transition-colors">
                {older.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {newer ? (
            <Link href={`/blogs/post?slug=${newer.slug}`} className={`${navCard} sm:text-right sm:items-end`}>
              <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-[hsl(var(--blog-muted))]">
                Newer <ArrowRight className="w-3 h-3" />
              </span>
              <span className="font-semibold text-[hsl(var(--blog-fg))] line-clamp-2 group-hover:text-[hsl(var(--blog-accent))] transition-colors">
                {newer.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-5">
            Related posts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
