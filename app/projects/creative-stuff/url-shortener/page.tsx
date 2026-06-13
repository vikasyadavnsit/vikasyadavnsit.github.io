"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  CheckCheck,
  Info,
  Scissors,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import "./themes.css";

const LS_KEY = "us_links";

interface ShortLink {
  code: string;
  originalUrl: string;
  created: number;
}

function readLinks(): ShortLink[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLinks(links: ShortLink[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(links));
}

function generateCode(existing: Set<string>): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code: string;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (existing.has(code));
  return code;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateUrl(url: string, max = 55) {
  if (url.length <= max) return url;
  return url.slice(0, max) + "…";
}

export default function UrlShortenerPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [url, setUrl] = useState("");
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [redirectNotice, setRedirectNotice] = useState("");

  // Sync with global light/dark mode
  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Load saved links
  useEffect(() => {
    setLinks(readLinks());
  }, []);

  // Handle ?r= redirect on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("r");
    if (!r) return;

    const stored = readLinks();
    const match = stored.find((l) => l.code === r);
    if (match) {
      window.open(match.originalUrl, "_blank");
      setRedirectNotice(`Opened ${truncateUrl(match.originalUrl, 60)} in a new tab.`);
    } else {
      setRedirectNotice(`Short link "${r}" was not found in this browser's storage.`);
    }
    history.replaceState(null, "", window.location.pathname);
  }, []);

  const getShortUrl = (code: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/projects/creative-stuff/url-shortener?r=${code}`;
  };

  const handleShorten = () => {
    setError("");
    let normalized = url.trim();
    if (!normalized) {
      setError("Please enter a URL.");
      return;
    }
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }
    try {
      new URL(normalized);
    } catch {
      setError("That doesn't look like a valid URL.");
      return;
    }
    const existing = readLinks();
    const existingCodes = new Set(existing.map((l) => l.code));
    const code = generateCode(existingCodes);
    const newLink: ShortLink = { code, originalUrl: normalized, created: Date.now() };
    const updated = [newLink, ...existing];
    writeLinks(updated);
    setLinks(updated);
    setLastCode(code);
    setUrl("");
  };

  const handleDelete = (code: string) => {
    const updated = links.filter((l) => l.code !== code);
    writeLinks(updated);
    setLinks(updated);
    if (lastCode === code) setLastCode(null);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const accent = theme === "dark" ? "#a78bfa" : "#7c3aed";
  const accentGlow = theme === "dark" ? "rgba(167,139,250,0.13)" : "rgba(124,58,237,0.10)";
  const accentRing = theme === "dark" ? "rgba(167,139,250,0.30)" : "rgba(124,58,237,0.35)";

  return (
    <div className={`us-theme-${theme} min-h-screen bg-background text-foreground`}>
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <Link
            href="/projects/creative-stuff"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to Creative Stuff
          </Link>

          <div className="flex items-center gap-5 mb-6 flex-wrap">
            <div
              className="inline-flex p-4 rounded-2xl shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #d946ef)" }}
            >
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
              URL <span className="text-muted-foreground">Shortener</span>
            </h1>
          </div>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Shorten any URL and store it in your browser. Share the short link — it works across any tab in this browser.
          </p>
        </motion.div>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-3 mb-8 p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm"
        >
          <Info className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">Browser-powered.</span>{" "}
            All operations happen locally using{" "}
            <code
              className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-card/60 border border-border"
              style={{ color: accent }}
            >
              localStorage
            </code>
            . Links are stored only in this browser and are not sent to any server. The short link works in any tab on this browser.
          </p>
        </motion.div>

        {/* Redirect notice */}
        <AnimatePresence>
          {redirectNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-2xl border text-sm"
              style={{
                background: accentGlow,
                borderColor: accentRing,
                color: "hsl(var(--foreground))",
              }}
            >
              {redirectNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shorten form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-8 rounded-3xl border border-border bg-card/40 backdrop-blur-xl mb-5"
        >
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Paste a long URL
          </label>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleShorten()}
              placeholder="https://example.com/very/long/path?with=lots&of=params"
              className="flex-1 bg-background/60 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
              style={
                {
                  "--tw-ring-color": accentRing,
                  boxShadow: url ? `0 0 0 2px ${accentRing}` : undefined,
                } as React.CSSProperties
              }
            />
            <button
              onClick={handleShorten}
              className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #d946ef)",
                boxShadow: `0 0 28px ${accentGlow}`,
              }}
            >
              <Scissors className="w-4 h-4" />
              Shorten
            </button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Result card */}
        <AnimatePresence>
          {lastCode && (
            <motion.div
              key={lastCode}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="mb-10 p-6 rounded-3xl border backdrop-blur-xl"
              style={{
                background: accentGlow,
                borderColor: accentRing,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Your short link is ready
              </p>
              <div className="flex items-center gap-3">
                <code className="flex-1 font-mono text-sm text-foreground break-all bg-background/50 px-4 py-3 rounded-2xl border border-border">
                  {getShortUrl(lastCode)}
                </code>
                <button
                  onClick={() => handleCopy(getShortUrl(lastCode), `result-${lastCode}`)}
                  title="Copy to clipboard"
                  className="shrink-0 p-3 rounded-xl border border-border bg-card/60 hover:bg-card transition-all"
                >
                  {copied === `result-${lastCode}` ? (
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Opening this link in any tab of this browser will automatically redirect to the original URL.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {links.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Saved Links{" "}
                <span className="text-foreground">({links.length})</span>
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {links.map((link, i) => (
                  <motion.div
                    key={link.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ delay: i * 0.04 }}
                    className="group p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300"
                    style={
                      {
                        "--hover-border": accentRing,
                      } as React.CSSProperties
                    }
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = accentRing)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "")
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Link2
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: accent }}
                          />
                          <span
                            className="font-mono text-xs font-semibold"
                            style={{ color: accent }}
                          >
                            {link.code}
                          </span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-muted-foreground text-xs">
                            {formatDate(link.created)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground break-all leading-relaxed">
                          {truncateUrl(link.originalUrl)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        <button
                          onClick={() => window.open(link.originalUrl, "_blank")}
                          title="Open original URL in new tab"
                          className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() =>
                            handleCopy(
                              getShortUrl(link.code),
                              `hist-${link.code}`
                            )
                          }
                          title="Copy short link"
                          className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all"
                        >
                          {copied === `hist-${link.code}` ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(link.code)}
                          title="Delete"
                          className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-red-500/40 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {links.length === 0 && !lastCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20 text-muted-foreground"
          >
            <Link2 className="w-10 h-10 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No links saved yet. Shorten your first URL above.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
