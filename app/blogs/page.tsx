"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, FileText, Eye, Sparkles } from "lucide-react";
import { subscribeToPosts } from "@/lib/blog/firebase-blog";
import type { BlogPost } from "@/lib/blog/types";
import BlogCard from "@/components/blog/BlogCard";
import SearchBar from "@/components/blog/SearchBar";
import SectionEyebrow from "@/components/blog/SectionEyebrow";

function StatCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-[var(--blog-radius-md)] blog-glass-card hover:-translate-y-0.5 transition-all duration-300">
      <div className="p-3 rounded-[var(--blog-radius-sm)] bg-[hsl(var(--blog-accent)/0.1)] border border-[hsl(var(--blog-border))]">
        <Icon className="w-5 h-5 text-[hsl(var(--blog-accent))]" />
      </div>
      <div>
        <div className="text-lg font-bold text-[hsl(var(--blog-fg))]">{value}</div>
        <div className="text-xs text-[hsl(var(--blog-muted))]">{label}</div>
      </div>
    </div>
  );
}

function CardGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
        >
          <BlogCard post={post} />
        </motion.div>
      ))}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[var(--blog-radius-lg)] blog-glass-card overflow-hidden animate-pulse">
          <div className="h-44 bg-[hsl(var(--blog-border))]" />
          <div className="p-6 flex flex-col gap-3.5">
            <div className="h-3 w-20 rounded bg-[hsl(var(--blog-border))]" />
            <div className="h-5 w-4/5 rounded bg-[hsl(var(--blog-border))]" />
            <div className="h-3 w-full rounded bg-[hsl(var(--blog-border))]" />
            <div className="h-3 w-2/3 rounded bg-[hsl(var(--blog-border))]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BlogsDashboard() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => subscribeToPosts(setPosts), []);

  const published = useMemo(() => (posts ?? []).filter((p) => p.published), [posts]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return published.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [published, searchQuery]);

  const newest = published.slice(0, 3);
  const archive = published.slice(3);
  const totalViews = published.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);

  const archiveByYear = useMemo(() => {
    const groups: Record<string, BlogPost[]> = {};
    archive.forEach((p) => {
      const year = new Date(p.publishedAt ?? p.createdAt).getFullYear().toString();
      groups[year] = groups[year] ?? [];
      groups[year].push(p);
    });
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [archive]);

  return (
    <div className="pt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex items-start justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px w-12 bg-[hsl(var(--blog-accent)/0.5)]" />
            <span className="font-bold uppercase tracking-[0.3em] text-xs text-[hsl(var(--blog-accent))]">Blog</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tighter">
            Latest <span className="text-[hsl(var(--blog-muted))]">Writing</span>
          </h1>
          <p className="text-lg text-[hsl(var(--blog-muted))] max-w-2xl">
            Long-form writing, notes, and deep dives.
          </p>
        </div>
        <Link
          href="/blogs/admin"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-accent))] transition-colors mt-1"
        >
          <Lock className="w-3.5 h-3.5" /> Admin
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-12 max-w-md">
        <StatCard icon={FileText} label="Posts" value={published.length} />
        <StatCard icon={Eye} label="Total views" value={totalViews} />
      </div>

      <div className="mb-12">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search posts by title, excerpt, or tag..." />
      </div>

      {posts === null && <CardGridSkeleton />}

      {posts !== null && published.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-[var(--blog-radius-lg)] border-2 border-dashed border-[hsl(var(--blog-border))] text-center">
          <FileText className="w-10 h-10 text-[hsl(var(--blog-muted))]" />
          <p className="text-[hsl(var(--blog-muted))]">No posts published yet.</p>
        </div>
      )}

      {filtered !== null ? (
        <section>
          <SectionEyebrow>
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </SectionEyebrow>
          <CardGrid posts={filtered} />
        </section>
      ) : (
        <>
          {newest.length > 0 && (
            <section className="mb-14">
              <SectionEyebrow icon={Sparkles}>Newest</SectionEyebrow>
              <CardGrid posts={newest} />
            </section>
          )}

          {archiveByYear.length > 0 && (
            <section>
              <SectionEyebrow>History</SectionEyebrow>
              {archiveByYear.map(([year, yearPosts]) => (
                <div key={year} className="relative pl-6 border-l border-[hsl(var(--blog-border))] mb-8">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[hsl(var(--blog-accent))]" />
                  <h3 className="text-lg font-bold text-[hsl(var(--blog-fg))] mb-3">{year}</h3>
                  <CardGrid posts={yearPosts} />
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
