"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowDown, ArrowUp, Activity, Zap,
  Play, X, ChevronLeft, RotateCcw, Sun, Moon,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpeedResult {
  id: string;
  timestamp: number;
  date: string;
  download: number | null;
  upload: number | null;
  ping: number | null;
  jitter: number | null;
}

type Phase = "idle" | "ping" | "download" | "upload" | "done";

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  dark: {
    page:       "bg-[#080810] text-white",
    sub:        "text-gray-500",
    muted:      "text-gray-700",
    card:       "bg-white/[0.04] border border-white/[0.08]",
    row:        "bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]",
    btn:        "bg-white text-black hover:bg-gray-100",
    toggle:     "bg-white/10 hover:bg-white/20 text-white",
    grid:       "#1a2030",
    axis:       "#4b5563",
    tip:        { backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 12, color: "#fff", fontSize: 12 },
    track:      "#1f2937",
    heading2:   "text-gray-800",
    back:       "text-gray-500 hover:text-white",
    clearBtn:   "text-red-600 hover:text-red-400",
    histDate:   "text-gray-600",
  },
  light: {
    page:       "bg-slate-50 text-gray-900",
    sub:        "text-gray-500",
    muted:      "text-gray-400",
    card:       "bg-white border border-gray-200 shadow-sm",
    row:        "bg-white border border-gray-100 hover:bg-gray-50",
    btn:        "bg-gray-900 text-white hover:bg-gray-800",
    toggle:     "bg-gray-200 hover:bg-gray-300 text-gray-700",
    grid:       "#e5e7eb",
    axis:       "#9ca3af",
    tip:        { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, color: "#fff", fontSize: 12 },
    track:      "#e2e8f0",
    heading2:   "text-gray-200",
    back:       "text-gray-500 hover:text-gray-900",
    clearBtn:   "text-red-500 hover:text-red-700",
    histDate:   "text-gray-500",
  },
} as const;

type ThemeKey = keyof typeof T;

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "speed_test_history";
const THEME_KEY   = "speed_test_theme";
const MAX_MBPS    = 500;
const MAX_MS      = 300;
const DL_STREAMS  = 4;           // parallel continuous-loop streams
const DL_SECS     = 8;           // measurement window in seconds
const UL_BYTES    = 20 * 1024 * 1024; // 20 MB upload

// Fill buffer with truly random data in 65536-byte chunks (crypto API limit)
function randomPayload(bytes: number): Uint8Array {
  const buf = new Uint8Array(bytes);
  for (let off = 0; off < bytes; off += 65536) {
    crypto.getRandomValues(buf.subarray(off, Math.min(off + 65536, bytes)));
  }
  return buf;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avg(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => n !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function r1(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}
function uid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}
function getRating(metric: string, value: number | null) {
  if (value === null) return { label: "—", color: "text-gray-500" };
  const thr: Record<string, [number, number, number]> = {
    download: [100, 25, 5], upload: [50, 10, 2], ping: [20, 60, 150], jitter: [10, 30, 60],
  };
  const [ex, good, fair] = thr[metric] ?? [0, 0, 0];
  const lo = metric === "ping" || metric === "jitter";
  if (lo ? value < ex   : value > ex)   return { label: "Excellent", color: "text-emerald-400" };
  if (lo ? value < good : value > good) return { label: "Good",      color: "text-green-400"   };
  if (lo ? value < fair : value > fair) return { label: "Fair",      color: "text-yellow-400"  };
  return { label: "Poor", color: "text-red-400" };
}

// ─── Smooth animation hook (RAF lerp) ─────────────────────────────────────────
function useSmoothValue(target: number, factor = 0.1) {
  const [disp, setDisp] = useState(0);
  const cur  = useRef(0);
  const tgt  = useRef(target);
  const raf  = useRef<number | null>(null);

  useEffect(() => {
    tgt.current = target;
    const tick = () => {
      const diff = tgt.current - cur.current;
      if (Math.abs(diff) < 0.05) { cur.current = tgt.current; setDisp(tgt.current); return; }
      cur.current += diff * factor;
      setDisp(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, factor]);

  return disp;
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
const PHASE_COLORS: Record<Phase, string> = {
  idle: "#374151", ping: "#f59e0b", download: "#3b82f6", upload: "#10b981", done: "#3b82f6",
};

function Gauge({ target, maxValue, unit, phase, trackColor }: {
  target: number; maxValue: number; unit: string; phase: Phase; trackColor: string;
}) {
  const value = useSmoothValue(target, 0.1);

  const R = 90, SW = 14, CX = 120, CY = 126, SIZE = 240;
  const START = 225, SWEEP = 270;
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt  = (d: number): [number, number] => [CX + R * Math.cos(rad(d)), CY + R * Math.sin(rad(d))];

  const arcPath = (start: number, degrees: number) => {
    const end = start + degrees;
    const [x1, y1] = pt(start);
    const [x2, y2] = pt(end);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${degrees > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  const circ   = 2 * Math.PI * R;
  const arcLen = (SWEEP / 360) * circ;
  const progress = Math.min(Math.max(value / maxValue, 0), 1);
  const offset   = arcLen * (1 - progress);
  const color    = PHASE_COLORS[phase];

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = START + (i / 10) * SWEEP;
    const major = i % 5 === 0;
    const oR = R + 10;
    const iR = R - (major ? 12 : 6);
    const [ox, oy] = pt(angle);
    const [ix, iy] = [CX + iR * Math.cos(rad(angle)), CY + iR * Math.sin(rad(angle))];
    const [lx, ly] = [CX + oR * Math.cos(rad(angle)), CY + oR * Math.sin(rad(angle))];
    return { ix, iy, lx, ly, major, angle, ox, oy };
  });

  const display = unit === "ms"
    ? Math.round(value)
    : value < 10 ? value.toFixed(1) : Math.round(value);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <path d={arcPath(START, SWEEP)} fill="none" stroke={trackColor} strokeWidth={SW} strokeLinecap="round" />
        {/* Foreground arc with glow */}
        <path
          d={arcPath(START, SWEEP)}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={offset}
          filter="url(#glow)"
          style={{ transition: "stroke 0.4s ease" }}
        />
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.lx} y1={t.ly} x2={t.ix} y2={t.iy}
            stroke={trackColor} strokeWidth={t.major ? 2 : 1} strokeLinecap="round" />
        ))}
      </svg>
      {/* Center labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 16 }}>
        <span className="text-5xl font-black tabular-nums leading-none" style={{ color }}>
          {display}
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.25em] mt-2 opacity-50">{unit}</span>
      </div>
    </div>
  );
}

// ─── Phase step indicator ─────────────────────────────────────────────────────
function PhaseSteps({ phase }: { phase: Phase }) {
  const steps: { key: Phase; label: string }[] = [
    { key: "ping", label: "Ping" }, { key: "download", label: "Download" }, { key: "upload", label: "Upload" },
  ];
  const order: Phase[] = ["idle", "ping", "download", "upload", "done"];
  const idx = order.indexOf(phase);

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const stepIdx = i + 1;
        const active  = phase === s.key;
        const done    = idx > stepIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div className={`h-px w-6 ${done ? "opacity-60" : "opacity-20"}`} style={{ backgroundColor: PHASE_COLORS[s.key] }} />}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${active ? "scale-125" : ""}`}
                style={{ backgroundColor: active || done ? PHASE_COLORS[s.key] : "#374151" }} />
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${active ? "opacity-100" : "opacity-30"}`}
                style={{ color: active ? PHASE_COLORS[s.key] : undefined }}>
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── fast.com API — returns unique CDN hostnames → separate TCP connections ───
async function getFastTargets(): Promise<string[]> {
  const TOKEN = "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm";
  const res = await fetch(
    `https://api.fast.com/netflix/speedtest/v2?https=true&token=${TOKEN}&urlCount=5`,
    { mode: "cors" }
  );
  if (!res.ok) throw new Error("fast.com API unavailable");
  const data = await res.json();
  return (data.targets as { url: string }[]).map(t => t.url);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SpeedTestPage() {
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const [phase, setPhase]       = useState<Phase>("idle");
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveUnit, setLiveUnit]   = useState<"Mbps" | "ms">("Mbps");
  const [result, setResult]       = useState<Omit<SpeedResult, "id" | "timestamp" | "date"> | null>(null);
  const [history, setHistory]     = useState<SpeedResult[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeLines, setActiveLines] = useState({ download: true, upload: true, ping: false });
  const dlBytesRef = useRef(0); // mutable byte counter — updated in reader loop without triggering re-renders

  const tk = T[theme];

  useEffect(() => {
    try {
      const raw  = localStorage.getItem(STORAGE_KEY);
      const thm  = localStorage.getItem(THEME_KEY) as ThemeKey | null;
      if (raw) setHistory(JSON.parse(raw));
      if (thm === "light" || thm === "dark") setTheme(thm);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };

  const persist = (list: SpeedResult[]) => {
    setHistory(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  // ── Ping ──────────────────────────────────────────────────────────────────
  const measurePing = async (): Promise<{ ping: number | null; jitter: number | null }> => {
    const rtts: number[] = [];
    for (let i = 0; i < 7; i++) {
      try {
        const t0 = performance.now();
        await fetch("https://1.1.1.1/cdn-cgi/trace", { cache: "no-store", mode: "cors" });
        const rtt = performance.now() - t0;
        rtts.push(rtt);
        if (i > 0) setLiveSpeed(Math.round(rtt));
      } catch { break; }
    }
    if (rtts.length < 2) return { ping: null, jitter: null };
    const valid = rtts.slice(1); // discard first (cold connection)
    const mean  = valid.reduce((a, b) => a + b, 0) / valid.length;
    const jitter = Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length);
    return { ping: Math.round(mean), jitter: Math.round(jitter) };
  };

  // ── Download — fast.com targets give separate TCP connections per stream ─────
  const measureDownload = async (): Promise<number | null> => {
    try {
      // Each URL is a unique Netflix CDN hostname → browser opens a separate TCP connection.
      // Cloudflare's public __down is rate-limited (~11 Mbps) and shares one HTTP/2 connection
      // across all streams to the same origin — that's why the old approach underreported.
      let urls: string[];
      try {
        urls = await getFastTargets();
      } catch {
        // Fallback if fast.com API is unreachable
        urls = [`https://speed.cloudflare.com/__down?bytes=25000000&_=${Math.random()}`];
      }

      dlBytesRef.current = 0;
      let active = true;
      const t0 = performance.now();

      const displayTimer = setInterval(() => {
        const secs = (performance.now() - t0) / 1000;
        if (secs > 0.3) setLiveSpeed(r1((dlBytesRef.current * 8) / (secs * 1e6)) ?? 0);
      }, 200);

      // One loop per URL; when a response ends, re-fetch the same URL for another chunk.
      const stream = async (url: string) => {
        while (active) {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.body || !res.ok) break;
            const reader = res.body.getReader();
            while (active) {
              const { done, value } = await reader.read();
              if (done) break;
              dlBytesRef.current += value.byteLength; // ref — zero React overhead
            }
          } catch { break; }
        }
      };

      // Race all streams vs the 10-second measurement window
      await Promise.race([
        Promise.all(urls.map(url => stream(url))),
        new Promise<void>(r => setTimeout(() => { active = false; r(); }, 10000)),
      ]);
      active = false;
      clearInterval(displayTimer);

      const secs = (performance.now() - t0) / 1000;
      return r1((dlBytesRef.current * 8) / (secs * 1e6));
    } catch { return null; }
  };

  // ── Upload — XHR for upload.onprogress + fully random payload ────────────
  const measureUpload = (): Promise<number | null> => {
    return new Promise(resolve => {
      try {
        // Fully random payload prevents HTTP/2 send-buffer compression
        const payload = randomPayload(UL_BYTES);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://speed.cloudflare.com/__up");
        const t0 = performance.now();

        xhr.upload.onprogress = (e) => {
          const secs = (performance.now() - t0) / 1000;
          if (secs > 0.3 && e.loaded > 0)
            setLiveSpeed(r1((e.loaded * 8) / (secs * 1e6)) ?? 0);
        };
        xhr.onload = () => {
          const secs = (performance.now() - t0) / 1000;
          resolve(r1((UL_BYTES * 8) / (secs * 1e6)));
        };
        xhr.onerror = () => resolve(null);
        xhr.ontimeout = () => resolve(null);
        xhr.timeout = 30000;
        xhr.send(payload.buffer as ArrayBuffer);
      } catch { resolve(null); }
    });
  };

  // ── Run test ──────────────────────────────────────────────────────────────
  const runTest = async () => {
    setResult(null);
    setLiveSpeed(0);

    setPhase("ping");    setLiveUnit("ms");   await new Promise(r => setTimeout(r, 50));
    const { ping, jitter } = await measurePing();

    setPhase("download"); setLiveUnit("Mbps"); setLiveSpeed(0);
    const download = await measureDownload();

    setPhase("upload");  setLiveUnit("Mbps"); setLiveSpeed(0);
    const upload = await measureUpload();

    const now = new Date();
    const entry: SpeedResult = {
      id: uid(),
      timestamp: now.getTime(),
      date: now.toISOString().slice(0, 10),
      download, upload, ping, jitter,
    };

    persist([entry, ...history]);
    setResult({ download, upload, ping, jitter });
    setLiveSpeed(download ?? 0);
    setLiveUnit("Mbps");
    setPhase("done");
  };

  const deleteEntry = (id: string) => persist(history.filter(h => h.id !== id));
  const clearAll = () => {
    if (window.confirm("Clear all test history?")) { persist([]); setSelectedDay(null); }
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const byDate: Record<string, SpeedResult[]> = {};
    history.forEach(r => { (byDate[r.date] ??= []).push(r); });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({
        date,
        download: +(avg(rows.map(r => r.download))?.toFixed(1) ?? 0),
        upload:   +(avg(rows.map(r => r.upload))?.toFixed(1)   ?? 0),
        ping:     +(avg(rows.map(r => r.ping))?.toFixed(0)     ?? 0),
        count: rows.length,
      }));
  }, [history]);

  const dayData = useMemo(() => {
    if (!selectedDay) return [];
    return history
      .filter(r => r.date === selectedDay)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        download: r.download ?? 0,
        upload:   r.upload   ?? 0,
        ping:     r.ping     ?? 0,
      }));
  }, [history, selectedDay]);

  const isRunning = phase !== "idle" && phase !== "done";
  const gaugeMax  = liveUnit === "ms" ? MAX_MS : MAX_MBPS;

  return (
    <main className={`min-h-screen transition-colors duration-300 ${tk.page}`}>
      <div className="max-w-3xl mx-auto px-5 pt-28 pb-24">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <Link href="/projects/creative-stuff"
              className={`inline-flex items-center gap-2 transition-colors text-sm group ${tk.back}`}>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Creative Stuff
            </Link>
            <button onClick={toggleTheme}
              className={`p-2.5 rounded-full transition-all ${tk.toggle}`}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-3">
            Speed <span className={tk.heading2}>Test</span>
          </h1>
          <p className={tk.sub}>Measure download, upload, ping &amp; jitter. History saved locally.</p>
        </motion.div>

        {/* Gauge + controls */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex flex-col items-center gap-6 mb-14">
          <Gauge target={liveSpeed} maxValue={gaugeMax} unit={liveUnit} phase={phase} trackColor={tk.track} />

          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.div key="steps" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <PhaseSteps phase={phase} />
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={runTest} disabled={isRunning}
            className={`flex items-center gap-2.5 px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-xl ${tk.btn}`}>
            {isRunning ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg> Testing…</>
            ) : (
              <><Play className="w-4 h-4" /> {phase === "done" ? "Run Again" : "Run Test"}</>
            )}
          </button>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && phase === "done" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 mb-12">
              {([
                { metric: "download", label: "Download", Icon: ArrowDown, value: result.download, unit: "Mbps", accent: "#3b82f6" },
                { metric: "upload",   label: "Upload",   Icon: ArrowUp,   value: result.upload,   unit: "Mbps", accent: "#10b981" },
                { metric: "ping",     label: "Ping",     Icon: Activity,  value: result.ping,     unit: "ms",   accent: "#f59e0b" },
                { metric: "jitter",   label: "Jitter",   Icon: Zap,       value: result.jitter,   unit: "ms",   accent: "#a855f7" },
              ] as const).map(({ metric, label, Icon, value, unit, accent }) => {
                const rating = getRating(metric, value);
                return (
                  <div key={metric} className={`p-5 rounded-3xl ${tk.card}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5" style={{ color: accent }}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${rating.color}`}>{rating.label}</span>
                    </div>
                    <div className="text-3xl font-black leading-none">
                      {value === null
                        ? <span className="opacity-30">—</span>
                        : <>{value}<span className="text-sm font-bold ml-1 opacity-40">{unit}</span></>
                      }
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Graph */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-10 p-5 rounded-3xl ${tk.card}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {selectedDay && (
                  <button onClick={() => setSelectedDay(null)}
                    className={`flex items-center gap-1 text-xs transition-colors ${tk.back}`}>
                    <ChevronLeft className="w-3.5 h-3.5" /> All Days
                  </button>
                )}
                <span className={`text-xs font-black uppercase tracking-[0.15em] ${tk.sub}`}>
                  {selectedDay ?? "Speed History"}
                </span>
                {selectedDay && dayData.length > 1 && (
                  <span className={`text-[9px] ${tk.muted}`}>{dayData.length} tests</span>
                )}
              </div>
              {!selectedDay && (
                <div className="flex gap-4">
                  {(["download", "upload", "ping"] as const).map(k => {
                    const c = k === "download" ? "#3b82f6" : k === "upload" ? "#10b981" : "#f59e0b";
                    return (
                      <button key={k} onClick={() => setActiveLines(p => ({ ...p, [k]: !p[k] }))}
                        className="text-[9px] font-black uppercase tracking-widest transition-opacity"
                        style={{ color: activeLines[k] ? c : undefined, opacity: activeLines[k] ? 1 : 0.3 }}>
                        {k}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              {selectedDay ? (
                <BarChart data={dayData} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tk.grid} />
                  <XAxis dataKey="time" tick={{ fill: tk.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tk.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tk.tip} cursor={{ fill: "rgba(128,128,128,0.05)" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, n: any) => [`${v ?? 0} ${n === "ping" ? "ms" : "Mbps"}`, n]} />
                  <Bar dataKey="download" fill="#3b82f6" radius={[4, 4, 0, 0]} name="download" maxBarSize={40} />
                  <Bar dataKey="upload"   fill="#10b981" radius={[4, 4, 0, 0]} name="upload"   maxBarSize={40} />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ left: -20, right: 8 }} style={{ cursor: "pointer" }}
                  onClick={e => { if (e?.activePayload?.[0]?.payload?.date) setSelectedDay(e.activePayload[0].payload.date); }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tk.grid} />
                  <XAxis dataKey="date" tick={{ fill: tk.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tk.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tk.tip} cursor={{ stroke: "rgba(128,128,128,0.1)", strokeWidth: 1 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, n: any) => [`${v ?? 0} ${n === "ping" ? "ms" : "Mbps"}`, n]} />
                  {activeLines.download && <Line type="monotone" dataKey="download" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6 }} name="download" />}
                  {activeLines.upload   && <Line type="monotone" dataKey="upload"   stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6 }} name="upload"   />}
                  {activeLines.ping     && <Line type="monotone" dataKey="ping"     stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 6 }} name="ping"     />}
                </LineChart>
              )}
            </ResponsiveContainer>
            {!selectedDay && (
              <p className={`text-center text-[10px] mt-3 ${tk.muted}`}>Click a point to view individual tests for that day</p>
            )}
          </motion.div>
        )}

        {/* History */}
        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-black uppercase tracking-[0.15em] ${tk.sub}`}>History</span>
              <button onClick={clearAll}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tk.clearBtn}`}>
                <RotateCcw className="w-3 h-3" /> Clear All
              </button>
            </div>
            <div className="space-y-1.5">
              {history.map(h => (
                <div key={h.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${tk.row}`}>
                  <span className={`text-[10px] shrink-0 w-24 ${tk.histDate}`}>
                    {new Date(h.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-blue-500 text-[11px] font-bold shrink-0">↓ {h.download ?? "—"}</span>
                  <span className="text-emerald-500 text-[11px] font-bold shrink-0">↑ {h.upload ?? "—"}</span>
                  <span className="text-amber-500 text-[11px] font-bold shrink-0">{h.ping ?? "—"}ms</span>
                  <span className="text-purple-500 text-[11px] font-bold flex-1">±{h.jitter ?? "—"}ms</span>
                  <button onClick={() => deleteEntry(h.id)} className={`transition-colors shrink-0 ${tk.muted} hover:text-red-500`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {history.length === 0 && phase === "idle" && (
          <p className={`text-center text-sm mt-6 ${tk.muted}`}>No tests yet — run your first test above.</p>
        )}
      </div>
    </main>
  );
}
