"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LockKeyhole,
  UnlockKeyhole,
  Upload,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  CheckCheck,
  AlertCircle,
  X,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import "./themes.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "encrypt" | "decrypt";
type Status = "idle" | "processing" | "done" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAGIC = new Uint8Array([0x46, 0x45, 0x4e, 0x43]); // "FENC"
const VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB

// ─── Crypto ───────────────────────────────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"] as KeyUsage[],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" } as Pbkdf2Params,
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"] as KeyUsage[],
  );
}

async function encryptFile(file: File, password: string): Promise<Uint8Array> {
  const fileData = new Uint8Array(await file.arrayBuffer());
  const metaJson = new TextEncoder().encode(
    JSON.stringify({ name: file.name, type: file.type || "application/octet-stream" }),
  );

  // Plaintext layout: [4-byte meta length][meta JSON][file bytes]
  const metaLen = new Uint8Array(4);
  new DataView(metaLen.buffer).setUint32(0, metaJson.length, false);
  const plaintext = new Uint8Array(4 + metaJson.length + fileData.length);
  plaintext.set(metaLen, 0);
  plaintext.set(metaJson, 4);
  plaintext.set(fileData, 4 + metaJson.length);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));

  // Output layout: [magic][version][salt][iv][ciphertext]
  const out = new Uint8Array(MAGIC.length + 1 + SALT_LEN + IV_LEN + ciphertext.length);
  let off = 0;
  out.set(MAGIC, off); off += MAGIC.length;
  out[off++] = VERSION;
  out.set(salt, off); off += SALT_LEN;
  out.set(iv, off); off += IV_LEN;
  out.set(ciphertext, off);
  return out;
}

async function decryptFile(data: ArrayBuffer, password: string): Promise<{ bytes: Uint8Array; name: string; type: string }> {
  if (data.byteLength < MAGIC.length + 1 + SALT_LEN + IV_LEN + 16) {
    throw new Error("File is too small to be a valid .enc file.");
  }

  const view = new DataView(data);
  const magic = new Uint8Array(data, 0, 4);
  if (magic[0] !== 0x46 || magic[1] !== 0x45 || magic[2] !== 0x4e || magic[3] !== 0x43) {
    throw new Error("Not a valid .enc file — magic bytes missing.");
  }

  let off = 4;
  const version = view.getUint8(off++);
  if (version !== VERSION) throw new Error(`Unsupported version: ${version}`);

  const salt = new Uint8Array(data, off, SALT_LEN); off += SALT_LEN;
  const iv = new Uint8Array(data, off, IV_LEN); off += IV_LEN;
  const ciphertext = data.slice(off);

  const key = await deriveKey(password, salt);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    throw new Error("Decryption failed — wrong password or corrupted file.");
  }

  const metaLen = new DataView(plaintext).getUint32(0, false);
  const metaBytes = new Uint8Array(plaintext, 4, metaLen);
  const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as { name: string; type: string };
  const fileBytes = new Uint8Array(plaintext, 4 + metaLen);

  return { bytes: fileBytes, name: meta.name, type: meta.type };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function downloadBlob(bytes: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function FileTypeIcon({ mimeType, className, style }: { mimeType: string; className?: string; style?: React.CSSProperties }) {
  const props = { className, style };
  if (mimeType.startsWith("image/")) return <FileImage {...props} />;
  if (mimeType.startsWith("video/")) return <FileVideo {...props} />;
  if (mimeType.startsWith("audio/")) return <FileAudio {...props} />;
  if (mimeType.startsWith("text/")) return <FileText {...props} />;
  if (mimeType.includes("pdf")) return <FileText {...props} />;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gz") || mimeType.includes("rar")) {
    return <FileArchive {...props} />;
  }
  return <File {...props} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FileEncryptorPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [tab, setTab] = useState<Tab>("encrypt");

  // ── Encrypt state ──────────────────────────────────────────────────────────
  const [encFile, setEncFile] = useState<File | null>(null);
  const [encPassword, setEncPassword] = useState("");
  const [encConfirm, setEncConfirm] = useState("");
  const [encShowPw, setEncShowPw] = useState(false);
  const [encShowConfirm, setEncShowConfirm] = useState(false);
  const [encStatus, setEncStatus] = useState<Status>("idle");
  const [encError, setEncError] = useState("");
  const [encOutput, setEncOutput] = useState("");
  const [encDragging, setEncDragging] = useState(false);

  // ── Decrypt state ──────────────────────────────────────────────────────────
  const [decFile, setDecFile] = useState<File | null>(null);
  const [decPassword, setDecPassword] = useState("");
  const [decShowPw, setDecShowPw] = useState(false);
  const [decStatus, setDecStatus] = useState<Status>("idle");
  const [decError, setDecError] = useState("");
  const [decOutput, setDecOutput] = useState("");
  const [decDragging, setDecDragging] = useState(false);

  const encFileInputRef = useRef<HTMLInputElement>(null);
  const decFileInputRef = useRef<HTMLInputElement>(null);

  // ── Theme sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Drag-and-drop helpers ──────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent, target: "enc" | "dec") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (target === "enc") { setEncFile(file); setEncStatus("idle"); setEncError(""); setEncOutput(""); setEncDragging(false); }
    else { setDecFile(file); setDecStatus("idle"); setDecError(""); setDecOutput(""); setDecDragging(false); }
  }, []);

  // ── Encrypt ────────────────────────────────────────────────────────────────
  const handleEncrypt = async () => {
    if (!encFile || !encPassword) return;
    if (encPassword !== encConfirm) { setEncError("Passwords do not match."); return; }
    if (encPassword.length < 4) { setEncError("Password must be at least 4 characters."); return; }

    setEncStatus("processing");
    setEncError("");
    try {
      const encrypted = await encryptFile(encFile, encPassword);
      const outName = `${encFile.name}.enc`;
      downloadBlob(encrypted, outName, "application/octet-stream");
      setEncOutput(outName);
      setEncStatus("done");
    } catch (err) {
      setEncError(err instanceof Error ? err.message : "Encryption failed.");
      setEncStatus("error");
    }
  };

  // ── Decrypt ────────────────────────────────────────────────────────────────
  const handleDecrypt = async () => {
    if (!decFile || !decPassword) return;

    setDecStatus("processing");
    setDecError("");
    try {
      const data = await decFile.arrayBuffer();
      const { bytes, name, type } = await decryptFile(data, decPassword);
      downloadBlob(bytes, name, type);
      setDecOutput(name);
      setDecStatus("done");
    } catch (err) {
      setDecError(err instanceof Error ? err.message : "Decryption failed.");
      setDecStatus("error");
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const accent = theme === "dark" ? "#2dd4bf" : "#0d9488";
  const accentGlow = theme === "dark" ? "rgba(45,212,191,0.15)" : "rgba(13,148,136,0.10)";
  const accentRing = theme === "dark" ? "rgba(45,212,191,0.30)" : "rgba(13,148,136,0.25)";

  const encReady = !!encFile && !!encPassword && encPassword === encConfirm && encPassword.length >= 4;
  const decReady = !!decFile && !!decPassword;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "encrypt", label: "Encrypt", icon: <LockKeyhole className="w-4 h-4" /> },
    { id: "decrypt", label: "Decrypt", icon: <UnlockKeyhole className="w-4 h-4" /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`fe-theme-${theme} min-h-screen bg-[#0a0a0a] text-foreground`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-32 pb-20">

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
              style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}
            >
              <LockKeyhole className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
                File <span className="text-muted-foreground">Encryptor</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Encrypt any file with a password. Nothing leaves your browser.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-start gap-3 mb-8 p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm"
        >
          <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">AES-256-GCM</span> encryption with{" "}
            <span className="text-foreground font-semibold">PBKDF2</span> key derivation (100k iterations).
            Works on any file type. Your files and password never leave this page.
          </p>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1.5 p-1.5 rounded-2xl border border-border bg-card/30 backdrop-blur-sm mb-8"
        >
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={
                tab === id
                  ? { background: accentGlow, color: accent, border: `1px solid ${accentRing}` }
                  : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }
              }
            >
              {icon}
              {label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── ENCRYPT TAB ──────────────────────────────────────────────── */}
          {tab === "encrypt" && (
            <motion.div
              key="encrypt"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setEncDragging(true); }}
                onDragLeave={() => setEncDragging(false)}
                onDrop={(e) => handleDrop(e, "enc")}
                onClick={() => !encFile && encFileInputRef.current?.click()}
                className="relative rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden"
                style={{
                  borderColor: encDragging ? accent : encFile ? accentRing : "hsl(var(--border))",
                  background: encDragging ? accentGlow : "hsl(var(--card) / 0.3)",
                  cursor: encFile ? "default" : "pointer",
                }}
              >
                <input
                  ref={encFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setEncFile(f); setEncStatus("idle"); setEncError(""); setEncOutput(""); }
                    e.target.value = "";
                  }}
                />

                {!encFile ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
                    <div className="p-4 rounded-2xl border border-dashed border-border" style={{ background: accentGlow }}>
                      <Upload className="w-8 h-8" style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Drop any file here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse · PDF, image, video, ZIP, anything</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-6 py-5">
                    <div className="p-3 rounded-2xl border border-border shrink-0" style={{ background: accentGlow }}>
                      <FileTypeIcon mimeType={encFile.type} className="w-6 h-6" style={{ color: accent } as React.CSSProperties} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{encFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(encFile.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEncFile(null); setEncStatus("idle"); setEncError(""); setEncOutput(""); }}
                      className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all shrink-0"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>

              {/* Large file warning */}
              {encFile && encFile.size > LARGE_FILE_THRESHOLD && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  <Info className="w-4 h-4 shrink-0" />
                  Large file ({formatBytes(encFile.size)}) — encryption may take a few seconds.
                </div>
              )}

              {/* Password fields */}
              <PasswordInput
                label="Password"
                value={encPassword}
                onChange={(v) => { setEncPassword(v); setEncError(""); }}
                show={encShowPw}
                onToggle={() => setEncShowPw((p) => !p)}
                accent={accent}
                accentRing={accentRing}
                placeholder="Enter a strong password"
              />
              <PasswordInput
                label="Confirm Password"
                value={encConfirm}
                onChange={(v) => { setEncConfirm(v); setEncError(""); }}
                show={encShowConfirm}
                onToggle={() => setEncShowConfirm((p) => !p)}
                accent={accent}
                accentRing={accentRing}
                placeholder="Re-enter password"
                error={encConfirm.length > 0 && encPassword !== encConfirm ? "Passwords don't match" : ""}
              />

              {/* Encrypt button */}
              <button
                onClick={handleEncrypt}
                disabled={!encReady || encStatus === "processing"}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}
              >
                {encStatus === "processing" ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Encrypting...</>
                ) : (
                  <><LockKeyhole className="w-4 h-4" /> Encrypt &amp; Download</>
                )}
              </button>

              {/* Feedback */}
              <AnimatePresence>
                {encStatus === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                  >
                    <CheckCheck className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Encrypted successfully!</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5">{encOutput} was downloaded.</p>
                    </div>
                  </motion.div>
                )}
                {(encStatus === "error" || encError) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {encError || "Encryption failed."}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── DECRYPT TAB ──────────────────────────────────────────────── */}
          {tab === "decrypt" && (
            <motion.div
              key="decrypt"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDecDragging(true); }}
                onDragLeave={() => setDecDragging(false)}
                onDrop={(e) => handleDrop(e, "dec")}
                onClick={() => !decFile && decFileInputRef.current?.click()}
                className="relative rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden"
                style={{
                  borderColor: decDragging ? accent : decFile ? accentRing : "hsl(var(--border))",
                  background: decDragging ? accentGlow : "hsl(var(--card) / 0.3)",
                  cursor: decFile ? "default" : "pointer",
                }}
              >
                <input
                  ref={decFileInputRef}
                  type="file"
                  accept=".enc"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setDecFile(f); setDecStatus("idle"); setDecError(""); setDecOutput(""); }
                    e.target.value = "";
                  }}
                />

                {!decFile ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
                    <div className="p-4 rounded-2xl border border-dashed border-border" style={{ background: accentGlow }}>
                      <UnlockKeyhole className="w-8 h-8" style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Drop a .enc file here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-6 py-5">
                    <div className="p-3 rounded-2xl border border-border shrink-0" style={{ background: accentGlow }}>
                      <LockKeyhole className="w-6 h-6" style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{decFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(decFile.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDecFile(null); setDecStatus("idle"); setDecError(""); setDecOutput(""); }}
                      className="p-2 rounded-xl border border-border bg-card/60 hover:bg-card transition-all shrink-0"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>

              {/* Large file warning */}
              {decFile && decFile.size > LARGE_FILE_THRESHOLD && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  <Info className="w-4 h-4 shrink-0" />
                  Large file ({formatBytes(decFile.size)}) — decryption may take a few seconds.
                </div>
              )}

              {/* Password field */}
              <PasswordInput
                label="Password"
                value={decPassword}
                onChange={(v) => { setDecPassword(v); setDecError(""); }}
                show={decShowPw}
                onToggle={() => setDecShowPw((p) => !p)}
                accent={accent}
                accentRing={accentRing}
                placeholder="Enter the file's password"
              />

              {/* Decrypt button */}
              <button
                onClick={handleDecrypt}
                disabled={!decReady || decStatus === "processing"}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}
              >
                {decStatus === "processing" ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Decrypting...</>
                ) : (
                  <><UnlockKeyhole className="w-4 h-4" /> Decrypt &amp; Download</>
                )}
              </button>

              {/* Feedback */}
              <AnimatePresence>
                {decStatus === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                  >
                    <CheckCheck className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Decrypted successfully!</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5">{decOutput} was downloaded.</p>
                    </div>
                  </motion.div>
                )}
                {(decStatus === "error" || decError) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {decError || "Decryption failed."}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 p-5 rounded-3xl border border-border bg-card/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4" style={{ color: accent }} />
            <p className="text-sm font-semibold">How it works</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
            {[
              { step: "1", title: "PBKDF2", body: "Your password is stretched through 100,000 iterations of PBKDF2-SHA256 with a random salt to derive a 256-bit key." },
              { step: "2", title: "AES-256-GCM", body: "The file is encrypted with AES-256-GCM using a random IV. The auth tag ensures any tampering is detected on decrypt." },
              { step: "3", title: "Self-contained", body: "Salt and IV are stored in the .enc file header. You only need your password to decrypt it — on any device with this page." },
            ].map(({ step, title, body }) => (
              <div key={step} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: accent }}
                  >{step}</span>
                  <span className="font-semibold text-foreground">{title}</span>
                </div>
                <p className="leading-relaxed pl-7">{body}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ─── PasswordInput subcomponent ───────────────────────────────────────────────

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  accent,
  accentRing,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  accent: string;
  accentRing: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
          style={value ? { boxShadow: `0 0 0 2px ${accentRing}` } : undefined}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 pl-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
