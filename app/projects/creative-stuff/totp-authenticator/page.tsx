"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Camera,
  Upload,
  Link2,
  KeyRound,
  Copy,
  CheckCheck,
  Trash2,
  Plus,
  X,
  ArrowRight,
  Info,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { TOTP } from "otpauth";
import jsQR from "jsqr";
import "./themes.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TotpAccount {
  id: string;
  label: string;
  issuer: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
}

type AddMode = "camera" | "upload" | "uri" | "manual";

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY = "totp_accounts";
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

// ─── Utilities ───────────────────────────────────────────────────────────────

function generateId(existing: Set<string>): string {
  let id: string;
  do {
    id = Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  } while (existing.has(id));
  return id;
}

function readAccounts(): TotpAccount[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAccounts(accounts: TotpAccount[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(accounts));
}

function parseOtpAuthUri(uri: string, existingIds: Set<string>): TotpAccount | null {
  try {
    const trimmed = uri.trim();
    const url = new URL(trimmed);
    if (url.protocol !== "otpauth:") return null;
    const secret = url.searchParams.get("secret");
    if (!secret) return null;
    const issuer = url.searchParams.get("issuer") || "";
    const rawLabel = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const label = rawLabel.includes(":") ? rawLabel.split(":").slice(1).join(":").trim() : rawLabel;
    const digits = parseInt(url.searchParams.get("digits") || "6", 10);
    const period = parseInt(url.searchParams.get("period") || "30", 10);
    const algorithm = url.searchParams.get("algorithm") || "SHA1";
    return {
      id: generateId(existingIds),
      label: label || issuer || "Account",
      issuer,
      secret,
      digits: isNaN(digits) ? 6 : digits,
      period: isNaN(period) ? 30 : period,
      algorithm,
    };
  } catch {
    return null;
  }
}

function generateCode(account: TotpAccount): string {
  try {
    const totp = new TOTP({
      secret: account.secret,
      digits: account.digits,
      period: account.period,
      algorithm: account.algorithm as "SHA1" | "SHA256" | "SHA512",
    });
    return totp.generate();
  } catch {
    return "------";
  }
}

function getRemaining(period: number): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

function getInitials(issuer: string, label: string): string {
  const src = issuer || label;
  return src.charAt(0).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TotpAuthenticatorPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(30);
  const [showPanel, setShowPanel] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("camera");
  const [copied, setCopied] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found">("idle");

  // Upload state
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "found" | "error">("idle");

  // URI state
  const [uriValue, setUriValue] = useState("");
  const [uriError, setUriError] = useState("");

  // Manual state
  const [manualName, setManualName] = useState("");
  const [manualIssuer, setManualIssuer] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [manualError, setManualError] = useState("");

  // ── Theme sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ── Load + tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = readAccounts();
    setAccounts(stored);
    const initial: Record<string, string> = {};
    stored.forEach((a) => (initial[a.id] = generateCode(a)));
    setCodes(initial);
    setRemaining(getRemaining(30));

    const interval = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          // Regenerate all codes
          setAccounts((current) => {
            const updated: Record<string, string> = {};
            current.forEach((a) => (updated[a.id] = generateCode(a)));
            setCodes(updated);
            return current;
          });
          return 30;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanStatus("idle");
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setScanStatus("scanning");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanFrame();
      }
    } catch {
      setCameraError("Camera permission denied or not available.");
      setScanStatus("idle");
    }
  }, []); // eslint-disable-line

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data) {
      const existing = readAccounts();
      const existingIds = new Set(existing.map((a) => a.id));
      const account = parseOtpAuthUri(result.data, existingIds);
      if (account) {
        setScanStatus("found");
        stopCamera();
        addAccount(account, existing);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]); // eslint-disable-line

  // Start camera when switching to camera tab while panel is open
  useEffect(() => {
    if (showPanel && addMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showPanel, addMode]); // eslint-disable-line

  // ── Image upload ─────────────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    setUploadStatus("idle");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = uploadCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) {
          const existing = readAccounts();
          const existingIds = new Set(existing.map((a) => a.id));
          const account = parseOtpAuthUri(result.data, existingIds);
          if (account) {
            setUploadStatus("found");
            addAccount(account, existing);
            return;
          }
        }
        setUploadStatus("error");
        setUploadError("No valid TOTP QR code found in this image.");
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── Add account ──────────────────────────────────────────────────────────────
  const addAccount = (account: TotpAccount, existing?: TotpAccount[]) => {
    const base = existing ?? readAccounts();
    const updated = [...base, account];
    writeAccounts(updated);
    setAccounts(updated);
    setCodes((prev) => ({ ...prev, [account.id]: generateCode(account) }));
    setTimeout(() => {
      setShowPanel(false);
      resetAddForm();
    }, 600);
  };

  const resetAddForm = () => {
    setUriValue("");
    setUriError("");
    setManualName("");
    setManualIssuer("");
    setManualSecret("");
    setManualError("");
    setUploadError("");
    setUploadStatus("idle");
    setScanStatus("idle");
    setCameraError("");
  };

  const handleUriSubmit = () => {
    setUriError("");
    if (!uriValue.trim()) { setUriError("Please paste an otpauth:// URI."); return; }
    const existing = readAccounts();
    const existingIds = new Set(existing.map((a) => a.id));
    const account = parseOtpAuthUri(uriValue, existingIds);
    if (!account) { setUriError("Invalid or unsupported otpauth:// URI."); return; }
    addAccount(account, existing);
  };

  const handleManualSubmit = () => {
    setManualError("");
    if (!manualName.trim()) { setManualError("Account name is required."); return; }
    if (!manualSecret.trim()) { setManualError("Secret key is required."); return; }
    const existing = readAccounts();
    const existingIds = new Set(existing.map((a) => a.id));
    const account: TotpAccount = {
      id: generateId(existingIds),
      label: manualName.trim(),
      issuer: manualIssuer.trim(),
      secret: manualSecret.trim().toUpperCase().replace(/\s/g, ""),
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    };
    // Validate by trying to generate
    const code = generateCode(account);
    if (code === "------") { setManualError("Invalid Base32 secret key."); return; }
    addAccount(account, existing);
  };

  const handleDelete = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    writeAccounts(updated);
    setAccounts(updated);
    setCodes((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code.replace(/\s/g, ""));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const accent = theme === "dark" ? "#38bdf8" : "#0284c7";
  const accentGlow = theme === "dark" ? "rgba(56,189,248,0.13)" : "rgba(2,132,199,0.10)";
  const accentRing = theme === "dark" ? "rgba(56,189,248,0.30)" : "rgba(2,132,199,0.35)";

  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - remaining / 30);
  const ringColor = remaining <= 5 ? "#f87171" : accent;

  const TABS: { mode: AddMode; label: string; icon: React.ReactNode }[] = [
    { mode: "camera", label: "Camera", icon: <Camera className="w-4 h-4" /> },
    { mode: "upload", label: "Image", icon: <Upload className="w-4 h-4" /> },
    { mode: "uri", label: "URI", icon: <Link2 className="w-4 h-4" /> },
    { mode: "manual", label: "Manual", icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <div className={`ta-theme-${theme} min-h-screen bg-background text-foreground`}>
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

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="inline-flex p-4 rounded-2xl shrink-0" style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}>
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
                  TOTP <span className="text-muted-foreground">Authenticator</span>
                </h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                  Two-factor authentication codes, stored in your browser.
                </p>
              </div>
            </div>

            <button
              onClick={() => { setShowPanel(true); setAddMode("camera"); }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white text-sm transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)", boxShadow: `0 0 24px ${accentGlow}` }}
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
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
            All accounts and secrets are stored locally using{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-card/60 border border-border" style={{ color: accent }}>
              localStorage
            </code>
            . Nothing is sent to any server. Codes are generated entirely in your browser per{" "}
            <span className="text-foreground">RFC 6238</span>.
          </p>
        </motion.div>

        {/* Account grid */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {accounts.map((account, i) => {
                const code = codes[account.id] || "------";
                const isExpiring = remaining <= 5;
                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-300 group"
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentRing)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                  >
                    {/* Top row: avatar + name + actions */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                          style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
                        >
                          {getInitials(account.issuer, account.label)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{account.label}</p>
                          {account.issuer && (
                            <p className="text-xs text-muted-foreground truncate">{account.issuer}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(code, account.id)}
                          title="Copy code"
                          className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all"
                        >
                          {copied === account.id ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          title="Delete account"
                          className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-red-500/40 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* Code + ring */}
                    <div className="flex items-center justify-between">
                      <span
                        className="font-mono text-3xl sm:text-4xl font-bold tracking-widest transition-all duration-300"
                        style={{ color: isExpiring ? "#f87171" : "hsl(var(--foreground))" }}
                      >
                        {formatCode(code)}
                      </span>

                      <div className="relative w-14 h-14 shrink-0">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                          <circle
                            cx="28" cy="28" r={ringRadius}
                            fill="none"
                            stroke="hsl(var(--border))"
                            strokeWidth="3"
                          />
                          <circle
                            cx="28" cy="28" r={ringRadius}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.3s ease" }}
                          />
                        </svg>
                        <span
                          className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold"
                          style={{ color: ringColor }}
                        >
                          {remaining}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {accounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-24"
          >
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground text-sm mb-6">No accounts added yet.</p>
            <button
              onClick={() => { setShowPanel(true); setAddMode("camera"); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
            >
              <Plus className="w-4 h-4" />
              Add your first account
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Add Account Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => { setShowPanel(false); resetAddForm(); }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-card/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl overflow-hidden">

                {/* Modal header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                  <h2 className="font-bold text-lg text-foreground">Add Account</h2>
                  <button
                    onClick={() => { setShowPanel(false); resetAddForm(); }}
                    className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto">
                  {TABS.map(({ mode, label, icon }) => (
                    <button
                      key={mode}
                      onClick={() => setAddMode(mode)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                      style={
                        addMode === mode
                          ? { background: accentGlow, color: accent, border: `1px solid ${accentRing}` }
                          : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
                      }
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="px-6 pb-6 pt-2">

                  {/* Camera */}
                  {addMode === "camera" && (
                    <div className="space-y-4">
                      <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-border aspect-video">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Scan overlay */}
                        {scanStatus === "scanning" && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-40 h-40 border-2 rounded-2xl" style={{ borderColor: accent }}>
                              <div className="w-full h-0.5 animate-pulse mt-[50%]" style={{ background: accent }} />
                            </div>
                          </div>
                        )}

                        {scanStatus === "found" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                            <div className="text-center">
                              <CheckCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                              <p className="text-sm font-semibold text-foreground">Account added!</p>
                            </div>
                          </div>
                        )}

                        {scanStatus === "idle" && !cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
                          </div>
                        )}
                      </div>

                      {cameraError && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {cameraError}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        Point your camera at a TOTP QR code. Detection is automatic.
                      </p>
                    </div>
                  )}

                  {/* Image upload */}
                  {addMode === "upload" && (
                    <div className="space-y-4">
                      <canvas ref={uploadCanvasRef} className="hidden" />

                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-border hover:border-[var(--ta-accent)] transition-all"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload a QR code image
                        </span>
                        <span className="text-xs text-muted-foreground/60">PNG, JPG, WEBP supported</span>
                      </button>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />

                      {uploadStatus === "found" && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                          <CheckCheck className="w-4 h-4 shrink-0" />
                          Account added successfully!
                        </div>
                      )}

                      {uploadStatus === "error" && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {uploadError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* URI paste */}
                  {addMode === "uri" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                          otpauth:// URI
                        </label>
                        <textarea
                          value={uriValue}
                          onChange={(e) => { setUriValue(e.target.value); setUriError(""); }}
                          placeholder="otpauth://totp/GitHub:user@example.com?secret=BASE32SECRET&issuer=GitHub"
                          rows={3}
                          className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none font-mono"
                          style={uriValue ? { boxShadow: `0 0 0 2px ${accentRing}` } : undefined}
                        />
                      </div>

                      {uriError && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {uriError}
                        </div>
                      )}

                      <button
                        onClick={handleUriSubmit}
                        className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95"
                        style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
                      >
                        Add Account
                      </button>
                    </div>
                  )}

                  {/* Manual entry */}
                  {addMode === "manual" && (
                    <div className="space-y-3">
                      {(
                        [
                          { label: "Account Name *", value: manualName, setter: setManualName, placeholder: "user@example.com", mono: false },
                          { label: "Issuer (optional)", value: manualIssuer, setter: setManualIssuer, placeholder: "GitHub", mono: false },
                          { label: "Secret Key (Base32) *", value: manualSecret, setter: setManualSecret, placeholder: "JBSWY3DPEHPK3PXP", mono: true },
                        ] as const
                      ).map(({ label, value, setter, placeholder, mono }) => (
                        <div key={label}>
                          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                            {label}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => { (setter as (v: string) => void)(e.target.value); setManualError(""); }}
                            placeholder={placeholder}
                            className={`w-full bg-background/60 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${mono ? "font-mono uppercase" : ""}`}
                          />
                        </div>
                      ))}

                      {manualError && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {manualError}
                        </div>
                      )}

                      <button
                        onClick={handleManualSubmit}
                        className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 mt-2"
                        style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
                      >
                        Add Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
