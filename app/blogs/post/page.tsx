"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPostBySlugOrId, incrementViewCount } from "@/lib/blog/firebase-blog";
import { sanitizeBlogHtml } from "@/lib/blog/sanitize";
import type { BlogPost } from "@/lib/blog/types";
import TagPills from "@/components/blog/TagPills";
import ViewCounterBadge from "@/components/blog/ViewCounterBadge";
import AttachmentList from "@/components/blog/AttachmentList";
import { useBlogTheme } from "@/components/blog/BlogThemeContext";

function PostContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const { mode } = useBlogTheme();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) {
      setPost(null);
      return;
    }
    let cancelled = false;
    getPostBySlugOrId(slug).then((found) => {
      if (cancelled) return;
      setPost(found);
      if (found) {
        const viewedKey = `blog-viewed-${found.id}`;
        if (!localStorage.getItem(viewedKey)) {
          localStorage.setItem(viewedKey, "1");
          incrementViewCount(found.id);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (post === undefined) {
    return <p className="text-[hsl(var(--blog-muted))] pt-12">Loading post...</p>;
  }

  if (post === null) {
    return (
      <div className="pt-12">
        <p className="text-[hsl(var(--blog-muted))] mb-4">Post not found.</p>
        <Link href="/blogs" className="text-[hsl(var(--blog-accent))]">Back to Blogs</Link>
      </div>
    );
  }

  const date = new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="pt-6 pb-12">
      <Link href="/blogs" className="text-sm text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-fg))] transition-colors">
        &larr; Back to Blogs
      </Link>

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-6 mb-4 text-[hsl(var(--blog-fg))]">
        {post.title}
      </h1>

      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-[hsl(var(--blog-muted))]">
        <span>{post.author}</span>
        <span>&middot;</span>
        <span>{date}</span>
        <ViewCounterBadge count={post.viewCount} />
      </div>

      <TagPills tags={post.tags} />

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="w-full rounded-2xl my-8 max-h-[420px] object-cover"
        />
      )}

      <div
        className={`prose prose-lg max-w-none ${mode === "dark" ? "prose-invert" : ""} [&_a]:text-[hsl(var(--blog-accent))] [&_blockquote]:border-[hsl(var(--blog-accent))] [&_code]:text-[hsl(var(--blog-accent))]`}
        dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.contentHtml) }}
      />

      {Object.keys(post.attachments ?? {}).length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-3">
            Attachments
          </h2>
          <AttachmentList attachments={post.attachments} />
        </div>
      )}
    </article>
  );
}

export default function BlogPostPage() {
  return (
    <Suspense fallback={<p className="text-[hsl(var(--blog-muted))] pt-12">Loading post...</p>}>
      <PostContent />
    </Suspense>
  );
}
