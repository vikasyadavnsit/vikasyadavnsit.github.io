"use client";
import { useState } from "react";
import { Link2, Check, Twitter, Linkedin, MessageCircle } from "lucide-react";

/** Static-safe share row: copy link + intent URLs (no third-party SDKs). */
export default function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const openIntent = (build: (url: string, title: string) => string) => {
    const url = getUrl();
    window.open(build(url, title), "_blank", "noopener,noreferrer");
  };

  const btn =
    "inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[hsl(var(--blog-border))] text-sm text-[hsl(var(--blog-muted))] hover:text-[hsl(var(--blog-fg))] hover:border-[hsl(var(--blog-accent))] transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-[hsl(var(--blog-muted))] mr-1">Share</span>
      <button type="button" onClick={copyLink} className={btn} aria-label="Copy link">
        {copied ? <Check className="w-4 h-4 text-[hsl(var(--blog-accent))]" /> : <Link2 className="w-4 h-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        aria-label="Share on X"
        className={btn}
        onClick={() =>
          openIntent((u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`)
        }
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Share on LinkedIn"
        className={btn}
        onClick={() => openIntent((u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`)}
      >
        <Linkedin className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Share on WhatsApp"
        className={btn}
        onClick={() => openIntent((u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`)}
      >
        <MessageCircle className="w-4 h-4" />
      </button>
    </div>
  );
}
