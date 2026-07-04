"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, FileText, Eye, Sparkles } from "lucide-react";
import { subscribeToPosts } from "@/lib/blog/firebase-blog";
import type { BlogPost } from "@/lib/blog/types";
import BlogCard from "@/components/blog/BlogCard";
import SearchBar from "@/components/blog/SearchBar";

function StatCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))]">
      <Icon className="w-5 h-5 text-[hsl(var(--blog-accent))]" />
      <div>
        <div className="text-lg font-bold text-[hsl(var(--blog-fg))]">{value}</div>
        <div className="text-xs text-[hsl(var(--blog-muted))]">{label}</div>
      </div>
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tighter">Blogs</h1>
        <p className="text-lg text-[hsl(var(--blog-muted))] max-w-2xl">
          Long-form writing, notes, and deep dives.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
        <StatCard icon={FileText} label="Posts" value={published.length} />
        <StatCard icon={Eye} label="Total views" value={totalViews} />
        <Link href="/blogs/admin" className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] hover:border-[hsl(var(--blog-accent))] transition-colors">
          <Lock className="w-5 h-5 text-[hsl(var(--blog-accent))]" />
          <span className="text-sm font-medium text-[hsl(var(--blog-fg))]">Admin</span>
        </Link>
      </div>

      <div className="mb-12">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search posts by title, excerpt, or tag..." />
      </div>

      {posts === null && (
        <p className="text-[hsl(var(--blog-muted))]">Loading posts...</p>
      )}

      {posts !== null && published.length === 0 && (
        <p className="text-[hsl(var(--blog-muted))]">No posts published yet.</p>
      )}

      {filtered !== null ? (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-4">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : (
        <>
          {newest.length > 0 && (
            <section className="mb-14">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-4">
                <Sparkles className="w-4 h-4" /> Newest
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newest.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {archiveByYear.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-4">
                History
              </h2>
              {archiveByYear.map(([year, yearPosts]) => (
                <div key={year} className="mb-8">
                  <h3 className="text-lg font-bold text-[hsl(var(--blog-fg))] mb-3">{year}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {yearPosts.map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
