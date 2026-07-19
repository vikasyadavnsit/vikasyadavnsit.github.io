"use client";
import { useEffect, useState, type RefObject } from "react";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return base ? `${base}-${index}` : `section-${index}`;
}

/**
 * Builds a table of contents from h2/h3 headings inside `articleRef` after content mounts.
 * Injects id slugs onto the headings (they aren't stored with ids) so anchor links work.
 */
export default function TableOfContents({
  articleRef,
  contentHtml,
}: {
  articleRef: RefObject<HTMLElement | null>;
  contentHtml: string;
}) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll("h2, h3")) as HTMLElement[];
    const next: TocItem[] = headings.map((h, i) => {
      if (!h.id) h.id = slugify(h.textContent || "", i);
      h.style.scrollMarginTop = "6rem";
      return { id: h.id, text: h.textContent || "", level: h.tagName === "H3" ? 3 : 2 };
    });
    setItems(next);

    if (next.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [articleRef, contentHtml]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="flex items-center gap-2 font-semibold uppercase tracking-widest text-xs text-[hsl(var(--blog-muted))] mb-3">
        <List className="w-4 h-4" /> On this page
      </p>
      <ul className="space-y-2 border-l border-[hsl(var(--blog-border))]">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? "1.5rem" : "0.75rem" }}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                history.replaceState(null, "", `#${item.id}`);
              }}
              className={`block -ml-px border-l-2 pl-3 py-0.5 transition-colors ${
                activeId === item.id
                  ? "border-[hsl(var(--blog-accent))] text-[hsl(var(--blog-accent))]"
                  : "border-transparent text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-fg))]"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
