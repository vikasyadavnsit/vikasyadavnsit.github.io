"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import hljs from "highlight.js";
import { User, Calendar, Clock } from "lucide-react";
import { getPostBySlugOrId, incrementViewCount, subscribeToPosts } from "@/lib/blog/firebase-blog";
import { sanitizeBlogHtml } from "@/lib/blog/sanitize";
import { readingTimeMinutes } from "@/lib/blog/reading-time";
import type { BlogPost } from "@/lib/blog/types";
import TagPills from "@/components/blog/TagPills";
import ViewCounterBadge from "@/components/blog/ViewCounterBadge";
import AttachmentList from "@/components/blog/AttachmentList";
import ReadingProgress from "@/components/blog/ReadingProgress";
import TableOfContents from "@/components/blog/TableOfContents";
import ShareBar from "@/components/blog/ShareBar";
import PostFooterNav from "@/components/blog/PostFooterNav";
import Lightbox from "@/components/blog/Lightbox";
import SectionEyebrow from "@/components/blog/SectionEyebrow";
import { useBlogTheme } from "@/components/blog/BlogThemeContext";

function PostContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const { mode } = useBlogTheme();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Full published list for prev/next + related navigation.
  useEffect(() => {
    const unsub = subscribeToPosts((posts) => setAllPosts(posts.filter((p) => p.published)));
    return unsub;
  }, []);

  // After content paints: syntax-highlight code blocks and add copy buttons.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !post) return;
    root.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code") as HTMLElement | null;
      if (code && !code.dataset.highlighted) {
        hljs.highlightElement(code);
      }
      if (pre.querySelector(".blog-copy-btn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "blog-copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(code?.textContent || "").then(() => {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1500);
        });
      });
      pre.appendChild(btn);
    });
  }, [post]);

  const onContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" && !target.closest(".blog-attachment-chip")) {
      const img = target as HTMLImageElement;
      setLightbox({ src: img.currentSrc || img.src, alt: img.alt });
    }
  };

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
  const minutes = readingTimeMinutes(post.contentHtml);
  const cleanHtml = sanitizeBlogHtml(post.contentHtml);

  return (
    <>
      <ReadingProgress />
      <article className="pt-6 pb-12">
        <Link href="/blogs" className="text-sm text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-fg))] transition-colors">
          &larr; Back to Blogs
        </Link>

        <div className="mt-6 lg:grid lg:grid-cols-[1fr_260px] lg:gap-10 lg:items-start">
          <div className="min-w-0">
            <header className="max-w-[72ch]">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[hsl(var(--blog-fg))]">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-sm text-[hsl(var(--blog-muted))]">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {post.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> {minutes} min read
                </span>
                <ViewCounterBadge count={post.viewCount} />
              </div>

              <TagPills tags={post.tags} />
            </header>

            {post.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-full max-w-[72ch] rounded-[var(--blog-radius-lg)] my-8 max-h-[460px] object-cover shadow-lg shadow-black/10"
              />
            )}

            <div className="lg:hidden mb-8 max-w-[72ch]">
              <details className="group rounded-[var(--blog-radius-md)] blog-glass-card p-4 [&_nav]:mt-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[hsl(var(--blog-fg))] flex items-center justify-between">
                  Table of contents
                  <span className="text-[hsl(var(--blog-muted))] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <TableOfContents articleRef={contentRef} contentHtml={cleanHtml} />
              </details>
            </div>

            <div
              ref={contentRef}
              onClick={onContentClick}
              className={`blog-content prose prose-lg max-w-[72ch] ${mode === "dark" ? "prose-invert" : ""}`}
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />

            {Object.keys(post.attachments ?? {}).length > 0 && (
              <div className="mt-10 max-w-[72ch] blog-glass-card rounded-[var(--blog-radius-md)] p-5">
                <SectionEyebrow>Attachments</SectionEyebrow>
                <AttachmentList attachments={post.attachments} />
              </div>
            )}

            <div className="lg:hidden mt-10 pt-8 max-w-[72ch] border-t border-[hsl(var(--blog-border))]">
              <ShareBar title={post.title} />
            </div>

            <div className="max-w-[72ch]">
              <PostFooterNav posts={allPosts} current={post} />
            </div>
          </div>

          <aside className="hidden lg:block sticky top-24 self-start">
            <div className="blog-glass-card rounded-[var(--blog-radius-md)] p-5">
              <TableOfContents articleRef={contentRef} contentHtml={cleanHtml} />
            </div>
            <div className="mt-6 blog-glass-card rounded-[var(--blog-radius-md)] p-5">
              <ShareBar title={post.title} />
            </div>
          </aside>
        </div>
      </article>

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </>
  );
}

export default function BlogPostPage() {
  return (
    <Suspense fallback={<p className="text-[hsl(var(--blog-muted))] pt-12">Loading post...</p>}>
      <PostContent />
    </Suspense>
  );
}
