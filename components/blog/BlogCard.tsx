import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { BlogPost } from "@/lib/blog/types";
import TagPills from "./TagPills";
import ViewCounterBadge from "./ViewCounterBadge";

export default function BlogCard({ post }: { post: BlogPost }) {
  const date = new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/blogs/post?slug=${encodeURIComponent(post.slug)}`}
      className="group flex flex-col h-full rounded-[var(--blog-radius-lg)] blog-glass-card overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:border-[hsl(var(--blog-accent)/0.3)]"
    >
      <div className="relative h-44 overflow-hidden shrink-0">
        {post.coverImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--blog-card))]/60 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--blog-accent)/0.15)] to-[hsl(var(--blog-accent)/0.05)]">
            <FileText className="w-10 h-10 text-[hsl(var(--blog-accent)/0.4)]" />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-6 gap-3.5">
        <span className="text-xs text-[hsl(var(--blog-muted))]">{date}</span>
        <h3 className="text-lg font-bold text-[hsl(var(--blog-fg))] group-hover:text-[hsl(var(--blog-accent))] transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-[hsl(var(--blog-muted))] line-clamp-3 flex-1">
          {post.excerpt}
        </p>
        <TagPills tags={post.tags} />
        <div className="flex items-center justify-between pt-2">
          <ViewCounterBadge count={post.viewCount} />
          <ArrowRight className="w-4 h-4 text-[hsl(var(--blog-accent))] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
