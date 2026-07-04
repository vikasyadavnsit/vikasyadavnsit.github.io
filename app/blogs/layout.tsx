"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./blog-theme.css";
import { BlogThemeProvider, useBlogTheme } from "@/components/blog/BlogThemeContext";
import BlogThemeToggle from "@/components/blog/BlogThemeToggle";

function BlogShell({ children }: { children: React.ReactNode }) {
  const { mode } = useBlogTheme();

  return (
    <div data-blog-theme="" className={mode === "dark" ? "blog-dark" : ""}>
      <header className="flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-fg))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portfolio
        </Link>
        <BlogThemeToggle />
      </header>
      <main className="max-w-5xl mx-auto px-6 pb-24">{children}</main>
    </div>
  );
}

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <BlogThemeProvider>
      <BlogShell>{children}</BlogShell>
    </BlogThemeProvider>
  );
}
