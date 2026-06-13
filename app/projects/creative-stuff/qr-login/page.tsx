"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { db } from "@/lib/firebase";
import { ref, set, onValue, update, get } from "firebase/database";
import Link from "next/link";
import {
  QrCode,
  Camera,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCheck,
  Monitor,
  Globe,
  Wifi,
  WifiOff,
  Clock,
  X,
  Info,
  ChevronRight,
} from "lucide-react";
import "./themes.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "host" | "scanner" | "result";
type SessionStatus = "creating" | "waiting" | "scanned" | "expired" | "error";

interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  orientation: string;
  connectionType: string | null;
  online: boolean;
  ip: string | null;
  scannedAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_DURATION = 5 * 60; // 300 seconds
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Array.from({ length: 20 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

function parseUA(ua: string): { browser: string; browserVersion: string; os: string } {
  let browser = "Unknown", browserVersion = "", os = "Unknown";

  if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1]?.split(".")[0] ?? "";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    browser = "Opera";
    browserVersion = ua.match(/OPR\/([\d.]+)/)?.[1]?.split(".")[0] ?? "";
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) {
    browser = "Chrome";
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1]?.split(".")[0] ?? "";
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1]?.split(".")[0] ?? "";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1]?.split(".")[0] ?? "";
  }

  if (ua.includes("iPhone")) {
    const v = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "";
    os = `iOS ${v}`;
  } else if (ua.includes("iPad")) {
    const v = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "";
    os = `iPadOS ${v}`;
  } else if (ua.includes("Android")) {
    const v = ua.match(/Android ([\d.]+)/)?.[1] ?? "";
    os = `Android ${v}`;
  } else if (ua.includes("Mac OS X")) {
    const v = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, ".") ?? "";
    os = `macOS ${v}`;
  } else if (ua.includes("Windows NT")) {
    const map: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    const v = ua.match(/Windows NT ([\d.]+)/)?.[1] ?? "";
    os = `Windows ${map[v] ?? v}`;
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  return { browser, browserVersion, os };
}

async function collectDeviceInfo(): Promise<DeviceInfo> {
  const { browser, browserVersion, os } = parseUA(navigator.userAgent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;

  let ip: string | null = null;
  try {
    const r = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    ip = (await r.json()).ip ?? null;
  } catch { /* best effort */ }

  return {
    browser,
    browserVersion,
    os,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio ?? 1,
    orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    connectionType: conn?.effectiveType ?? conn?.type ?? null,
    online: navigator.onLine,
    ip,
    scannedAt: Date.now(),
  };
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QRLoginPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [view, setView] = useState<View>("host");

  // Host view state
  const [sessionId, setSessionId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("creating");
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [qrUrl, setQrUrl] = useState("");
  const [scannedDevice, setScannedDevice] = useState<DeviceInfo | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Scanner view state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found">("idle");
  const [scannedText, setScannedText] = useState("");

  // Result view state
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [resultStatus, setResultStatus] = useState<"loading" | "success" | "error">("loading");
  const [resultError, setResultError] = useState("");

  // Refs for cleanup
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // ── Theme sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Session creation ───────────────────────────────────────────────────────
  const createNewSession = useCallback(async () => {
    unsubRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);
    setScannedDevice(null);
    setSessionStatus("creating");
    setTimeLeft(SESSION_DURATION);

    const id = generateId();
    const now = Date.now();
    const url = `${window.location.origin}${window.location.pathname}?session=${id}`;

    setSessionId(id);
    setQrUrl(url);

    try {
      await set(ref(db, `qr-sessions/${id}`), {
        createdAt: now,
        expiresAt: now + SESSION_DURATION * 1000,
        status: "waiting",
      });
      setSessionStatus("waiting");
      setOfflineMode(false);

      // Listen for scan in real-time
      unsubRef.current = onValue(ref(db, `qr-sessions/${id}/scanner`), (snap) => {
        if (snap.exists()) {
          setScannedDevice(snap.val() as DeviceInfo);
          setSessionStatus("scanned");
        }
      });

      // Countdown timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setSessionStatus("expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      // Offline fallback: QR still shown but no cross-device sync
      setOfflineMode(true);
      setSessionStatus("waiting");
    }
  }, []); // eslint-disable-line

  // Auto-regenerate when session expires
  useEffect(() => {
    if (sessionStatus === "expired" && view === "host") {
      createNewSession();
    }
  }, [sessionStatus, view]); // eslint-disable-line

  // ── URL param routing ─────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");

    if (session) {
      setView("result");
      (async () => {
        setResultStatus("loading");
        const info = await collectDeviceInfo();
        setDeviceInfo(info);

        try {
          const snap = await get(ref(db, `qr-sessions/${session}`));
          if (!snap.exists()) {
            setResultStatus("error");
            setResultError("Session not found. The QR may have already been used.");
            return;
          }
          const data = snap.val();
          if (data.status === "expired" || Date.now() > data.expiresAt) {
            setResultStatus("error");
            setResultError("This QR code has expired. Ask the host to refresh it.");
            return;
          }
          await update(ref(db, `qr-sessions/${session}`), { status: "scanned", scanner: info });
          setResultStatus("success");
        } catch {
          // Offline fallback: show info locally without Firebase write
          setResultStatus("success");
        }
      })();
    } else {
      createNewSession();
    }
  }, []); // eslint-disable-line

  // ── Camera scanner ────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanStatus("idle");
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (result?.data) {
      setScanStatus("found");
      setScannedText(result.data);
      stopCamera();
      // Navigate if it's a session URL from this app
      if (result.data.startsWith(window.location.origin) && result.data.includes("session=")) {
        setTimeout(() => { window.location.href = result.data; }, 600);
      }
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setScannedText("");
    setScanStatus("scanning");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;

      // Poll until the video element is mounted (may be delayed by AnimatePresence)
      const attach = () => {
        if (!streamRef.current) return; // camera was stopped before element mounted
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(scanFrame).catch(() => {});
        } else {
          requestAnimationFrame(attach);
        }
      };
      attach();
    } catch {
      setCameraError("Camera permission denied or not available.");
      setScanStatus("idle");
    }
  }, [scanFrame]);

  useEffect(() => {
    if (view === "scanner") startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [view]); // eslint-disable-line

  // ── Global cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      unsubRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Derived theme values ──────────────────────────────────────────────────
  const accent = theme === "dark" ? "#a78bfa" : "#7c3aed";
  const accentGlow = theme === "dark" ? "rgba(167,139,250,0.15)" : "rgba(124,58,237,0.10)";
  const accentRing = theme === "dark" ? "rgba(167,139,250,0.30)" : "rgba(124,58,237,0.25)";
  const ringColor = timeLeft <= 30 ? "#f87171" : accent;

  const navigateToHost = () => {
    window.history.replaceState({}, "", window.location.pathname);
    setView("host");
    createNewSession();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`qrl-theme-${theme} min-h-screen bg-[#0a0a0a] text-foreground`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
          <Link
            href="/projects/creative-stuff"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group text-sm"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to Creative Stuff
          </Link>

          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="inline-flex p-4 rounded-2xl shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}
            >
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
                QR <span className="text-muted-foreground">Login</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Scan a QR to reveal the scanner&apos;s device details in real-time.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Offline mode banner */}
        {offlineMode && view === "host" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 mb-6 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10"
          >
            <WifiOff className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300 leading-relaxed">
              <span className="font-semibold">Offline demo mode.</span>{" "}
              Firebase is unavailable. The QR still works — scanning it will show the scanner&apos;s device details locally, but won&apos;t sync here in real-time.
            </p>
          </motion.div>
        )}

        <AnimatePresence>

          {/* ── HOST VIEW ─────────────────────────────────────────────────── */}
          {view === "host" && (
            <motion.div
              key="host"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* How it works */}
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
                <Info className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-semibold">How it works:</span>{" "}
                  Another device scans this QR (with any QR scanner or the built-in one below).
                  Their browser opens this page with a session token, and their device details appear here live via{" "}
                  <span className="text-foreground">Firebase Realtime Database</span>.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-10 items-start">

                {/* Left: QR + countdown */}
                <div className="flex flex-col items-center gap-5 flex-shrink-0 w-full lg:w-auto">
                  <div className="p-5 bg-white rounded-3xl shadow-2xl">
                    {qrUrl ? (
                      <QRCodeSVG
                        value={qrUrl}
                        size={220}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        level="M"
                        includeMargin={false}
                      />
                    ) : (
                      <div className="w-[220px] h-[220px] flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Countdown ring */}
                  <div className="relative flex items-center justify-center">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="33" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                      <circle
                        cx="40" cy="40" r="33"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 33}
                        strokeDashoffset={2 * Math.PI * 33 * (1 - timeLeft / SESSION_DURATION)}
                        style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.3s" }}
                      />
                    </svg>
                    <span className="absolute font-mono text-sm font-bold" style={{ color: ringColor }}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {sessionStatus === "waiting" && "Waiting for scan..."}
                      {sessionStatus === "scanned" && "Device connected!"}
                      {sessionStatus === "creating" && "Generating..."}
                      {sessionStatus === "expired" && "Regenerating..."}
                    </p>
                    <button
                      onClick={createNewSession}
                      className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-3 h-3" />
                      New QR
                    </button>
                  </div>
                </div>

                {/* Right: scanner button + device info */}
                <div className="flex-1 space-y-6 w-full">
                  {/* Open scanner button */}
                  <button
                    onClick={() => setView("scanner")}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl border border-border bg-card/40 hover:bg-card/60 transition-all group"
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentRing)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ background: accentGlow }}>
                        <Camera className="w-5 h-5" style={{ color: accent }} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">Open Camera Scanner</p>
                        <p className="text-xs text-muted-foreground">Scan any QR code from this device</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Scanned device info */}
                  <AnimatePresence>
                    {scannedDevice && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCheck className="w-5 h-5 text-emerald-400" />
                          <p className="font-semibold text-emerald-400 text-sm">Device connected!</p>
                        </div>
                        <DeviceInfoCards info={scannedDevice} accent={accent} accentGlow={accentGlow} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Waiting state */}
                  {!scannedDevice && (sessionStatus === "waiting" || sessionStatus === "creating") && (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="relative">
                        <QrCode className="w-12 h-12 opacity-20" />
                        <div
                          className="absolute inset-0 rounded-full animate-ping opacity-10"
                          style={{ background: accent, animationDuration: "2.5s" }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Waiting for a device to scan the QR code...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SCANNER VIEW ──────────────────────────────────────────────── */}
          {view === "scanner" && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Camera Scanner</h2>
                <button
                  onClick={() => setView("host")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all text-sm text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                  Back
                </button>
              </div>

              {/* Camera feed */}
              <div
                className="relative rounded-3xl overflow-hidden bg-black border border-border"
                style={{ aspectRatio: "16/9", maxHeight: "480px" }}
              >
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Corner bracket overlay */}
                {scanStatus === "scanning" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-52 h-52 relative">
                      {[
                        ["top-0 left-0", "border-t-2 border-l-2"],
                        ["top-0 right-0", "border-t-2 border-r-2"],
                        ["bottom-0 left-0", "border-b-2 border-l-2"],
                        ["bottom-0 right-0", "border-b-2 border-r-2"],
                      ].map(([pos, border]) => (
                        <div
                          key={pos}
                          className={`absolute w-8 h-8 rounded-sm ${pos} ${border}`}
                          style={{ borderColor: accent }}
                        />
                      ))}
                      <div
                        className="absolute top-1/2 w-full h-0.5 animate-pulse"
                        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                      />
                    </div>
                  </div>
                )}

                {scanStatus === "found" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                    <div className="text-center">
                      <CheckCheck className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                      <p className="font-semibold">QR Detected!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {scannedText.includes("session=") ? "Connecting..." : "Content read"}
                      </p>
                    </div>
                  </div>
                )}

                {scanStatus === "idle" && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {cameraError}
                </div>
              )}

              {/* Non-session QR result */}
              {scannedText && scanStatus === "found" && !scannedText.includes("session=") && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl border border-border bg-card/40 space-y-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Decoded QR Content
                  </p>
                  <p className="text-sm font-mono break-all text-foreground">{scannedText}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(scannedText)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border bg-card hover:bg-card/80 transition-all"
                    >
                      <CheckCheck className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={() => { setScannedText(""); setScanStatus("idle"); startCamera(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border bg-card hover:bg-card/80 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Scan Again
                    </button>
                  </div>
                </motion.div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Scanning for QR codes automatically. Session QRs from this app connect both devices instantly.
              </p>
            </motion.div>
          )}

          {/* ── RESULT VIEW ───────────────────────────────────────────────── */}
          {view === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {resultStatus === "loading" && (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <RefreshCw className="w-10 h-10 animate-spin" style={{ color: accent }} />
                  <p className="text-sm text-muted-foreground">Collecting device info...</p>
                </div>
              )}

              {resultStatus === "error" && (
                <div className="flex flex-col items-center justify-center py-28 text-center gap-6">
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg mb-2">Session Invalid</p>
                    <p className="text-sm text-muted-foreground">{resultError}</p>
                  </div>
                  <button
                    onClick={navigateToHost}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}
                  >
                    <QrCode className="w-4 h-4" />
                    Show My QR Code
                  </button>
                </div>
              )}

              {resultStatus === "success" && deviceInfo && (
                <div className="space-y-6">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-4 p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10"
                  >
                    <div className="p-3 rounded-2xl bg-emerald-500/20 shrink-0">
                      <CheckCheck className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-400 text-lg">Connected!</p>
                      <p className="text-sm text-emerald-400/70">
                        Your device details were sent to the host. Here&apos;s what was shared:
                      </p>
                    </div>
                  </motion.div>

                  <DeviceInfoCards info={deviceInfo} accent={accent} accentGlow={accentGlow} />

                  <button
                    onClick={navigateToHost}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 w-full sm:w-auto"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}
                  >
                    <QrCode className="w-4 h-4" />
                    Show My QR Code
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── DeviceInfoCards ──────────────────────────────────────────────────────────

function DeviceInfoCards({
  info,
  accent,
  accentGlow,
}: {
  info: DeviceInfo;
  accent: string;
  accentGlow: string;
}) {
  const cards = [
    {
      title: "Browser",
      icon: <Globe className="w-5 h-5" style={{ color: accent }} />,
      rows: [
        ["Browser", `${info.browser}${info.browserVersion ? ` ${info.browserVersion}` : ""}`],
        ["OS", info.os],
      ],
    },
    {
      title: "Screen",
      icon: <Monitor className="w-5 h-5" style={{ color: accent }} />,
      rows: [
        ["Screen", `${info.screenWidth} × ${info.screenHeight}px`],
        ["Viewport", `${info.viewportWidth} × ${info.viewportHeight}px`],
        ["DPR", `${info.pixelRatio}×`],
        ["Orientation", info.orientation],
      ],
    },
    {
      title: "Network",
      icon: info.online
        ? <Wifi className="w-5 h-5" style={{ color: accent }} />
        : <WifiOff className="w-5 h-5 text-red-400" />,
      rows: [
        ["Status", info.online ? "Online" : "Offline"],
        ["Connection", info.connectionType ?? "—"],
        ["IP Address", info.ip ?? "Unavailable"],
      ],
    },
    {
      title: "Timestamp",
      icon: <Clock className="w-5 h-5" style={{ color: accent }} />,
      rows: [["Scanned at", formatDate(info.scannedAt)]],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl" style={{ background: accentGlow }}>
              {card.icon}
            </div>
            <p className="font-semibold text-sm">{card.title}</p>
          </div>
          <div className="space-y-2.5">
            {card.rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
                <span className="text-xs font-mono text-foreground text-right truncate">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
