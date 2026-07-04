import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
      className="group flex flex-col h-full rounded-2xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] overflow-hidden hover:border-[hsl(var(--blog-accent))] transition-colors"
    >
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="flex flex-col flex-1 p-6 gap-3">
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
