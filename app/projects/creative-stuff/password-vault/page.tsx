"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound, Lock, Unlock, Eye, EyeOff, Copy, CheckCheck, Trash2,
  Plus, Download, Upload, Search, RefreshCw, X, ExternalLink,
  ShieldCheck, AlertTriangle, Info, ArrowRight, Sun, Moon, Shuffle,
} from "lucide-react";
import Link from "next/link";
import "./themes.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type VaultState = "loading" | "create" | "locked" | "unlocked";

interface VaultStorage {
  salt: string; iv: string; ciphertext: string;
  verifierIv: string; verifier: string; updatedAt: number;
}
interface PasswordEntry {
  id: string; site: string; username: string; password: string;
  url: string; notes: string; createdAt: number; updatedAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PV_KEY = "pv_vault";
const LOCK_MS = 5 * 60 * 1000;
const WARN_MS = 30 * 1000;
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const GEN_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GEN_LOWER = "abcdefghijklmnopqrstuvwxyz";
const GEN_NUMS  = "0123456789";
const GEN_SYMS  = "!@#$%^&*()-_=+[]{}|;:,.<>?";

// ─── Crypto Utils ─────────────────────────────────────────────────────────────
function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf);
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(""));
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"] as KeyUsage[]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" } as Pbkdf2Params,
    raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"] as KeyUsage[]
  );
}

async function aesEncrypt(plaintext: string, key: CryptoKey): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv } as AesGcmParams, key, new TextEncoder().encode(plaintext)
  );
  return { iv: b64(iv), ct: b64(ct) };
}

async function aesDecrypt(iv: string, ct: string, key: CryptoKey): Promise<string> {
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv) } as AesGcmParams, key, unb64(ct).buffer as ArrayBuffer
  );
  return new TextDecoder().decode(buf);
}

// ─── URL Utils ────────────────────────────────────────────────────────────────
function normalizeUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return "https://" + t;
}
function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;
  try { new URL(normalizeUrl(url)); return true; } catch { return false; }
}

// ─── Password Utils ───────────────────────────────────────────────────────────
function makeId(): string {
  let id = "";
  do { id = Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(""); }
  while (!id);
  return id;
}

function genPassword(len: number, upper: boolean, lower: boolean, nums: boolean, syms: boolean): string {
  let pool = "";
  if (upper) pool += GEN_UPPER;
  if (lower) pool += GEN_LOWER;
  if (nums)  pool += GEN_NUMS;
  if (syms)  pool += GEN_SYMS;
  if (!pool) pool = GEN_LOWER + GEN_NUMS;
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, x => pool[x % pool.length]).join("");
}

function pwStrength(pw: string): { score: 0|1|2|3|4; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 14) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.min(4, s) as 0|1|2|3|4;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-green-400"];
  return { score, label: labels[score], color: colors[score] };
}

function strengthBar(score: number, max = 4) {
  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400"];
  return (
    <div className="flex gap-1 h-1.5">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`flex-1 rounded-full transition-all ${i < score ? colors[score] : "bg-border"}`} />
      ))}
    </div>
  );
}

// ─── GeneratorPanel ───────────────────────────────────────────────────────────
function GeneratorPanel({
  onClose, onFill, accent, accentGlow, accentRing,
}: {
  onClose: () => void;
  onFill?: (pw: string) => void;
  accent: string; accentGlow: string; accentRing: string;
}) {
  const [len, setLen] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [nums, setNums]   = useState(true);
  const [syms, setSyms]   = useState(true);
  const [pw, setPw] = useState(() => genPassword(20, true, true, true, true));
  const [copied, setCopied] = useState(false);

  const regen = useCallback(() => setPw(genPassword(len, upper, lower, nums, syms)), [len, upper, lower, nums, syms]);
  useEffect(() => { regen(); }, [len, upper, lower, nums, syms]);

  const copy = () => { navigator.clipboard.writeText(pw); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const { score, label, color } = pwStrength(pw);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/40 backdrop-blur-sm z-20 md:hidden" onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-30 w-full md:w-[380px] bg-card/95 backdrop-blur-2xl border-l border-border flex flex-col overflow-hidden"
        style={{ paddingTop: "5rem" }}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" style={{ color: accent }} />
            <span className="font-semibold text-sm text-foreground">Password Generator</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl border border-border bg-background/40 hover:bg-muted/60 transition-all">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Generated password */}
          <div className="p-4 rounded-2xl border border-border bg-background/50">
            <p className="font-mono text-lg font-semibold text-foreground break-all leading-relaxed">{pw}</p>
            <div className="mt-3 space-y-1.5">
              {strengthBar(score)}
              {label && <p className={`text-xs font-semibold ${color}`}>{label}</p>}
            </div>
          </div>

          {/* Length slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Length</label>
              <span className="text-sm font-bold text-foreground">{len}</span>
            </div>
            <input type="range" min={8} max={64} value={len} onChange={e => setLen(+e.target.value)}
              className="w-full h-1.5 rounded-full accent-amber-500 cursor-pointer" />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-2">
            {([
              ["Uppercase A–Z", upper, setUpper],
              ["Lowercase a–z", lower, setLower],
              ["Numbers 0–9",  nums,  setNums],
              ["Symbols !@#",  syms,  setSyms],
            ] as [string, boolean, (v: boolean) => void][]).map(([lbl, val, fn]) => (
              <button key={lbl} onClick={() => fn(!val)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${val ? "text-foreground" : "text-muted-foreground border-border bg-background/30"}`}
                style={val ? { borderColor: accentRing, background: accentGlow, color: accent } : undefined}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={regen}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-background/40 hover:bg-muted/60 text-sm font-semibold text-foreground transition-all">
              <RefreshCw className="w-4 h-4" /> Regenerate
            </button>
            <button onClick={copy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
              {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {onFill && (
            <button onClick={() => { onFill(pw); onClose(); }}
              className="w-full py-3 rounded-2xl border font-semibold text-sm transition-all hover:scale-[1.02]"
              style={{ borderColor: accentRing, background: accentGlow, color: accent }}>
              Fill into entry
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}

// ─── EntryPanel ───────────────────────────────────────────────────────────────
function EntryPanel({
  entry, isNew, onSave, onDelete, onClose, onOpenGenerator, accent, accentGlow, accentRing,
}: {
  entry: PasswordEntry; isNew: boolean;
  onSave: (e: PasswordEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onOpenGenerator: (fillFn: (pw: string) => void) => void;
  accent: string; accentGlow: string; accentRing: string;
}) {
  const [form, setForm] = useState(entry);
  const [showPw, setShowPw] = useState(isNew);
  const [copied, setCopied] = useState<"username" | "password" | null>(null);

  useEffect(() => { setForm(entry); setShowPw(isNew); }, [entry.id]);

  const set = (k: keyof PasswordEntry, v: string) => setForm(f => ({ ...f, [k]: v }));
  const copyField = (val: string, field: "username" | "password") => {
    navigator.clipboard.writeText(val);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const { score, label, color } = pwStrength(form.password);
  const initials = (form.site || "?").charAt(0).toUpperCase();

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/40 backdrop-blur-sm z-20 md:hidden" onClick={onClose} />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-30 w-full md:w-[440px] bg-card/95 backdrop-blur-2xl border-l border-border flex flex-col overflow-hidden"
        style={{ paddingTop: "5rem" }}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
              {initials}
            </div>
            <span className="font-semibold text-sm text-foreground">{isNew ? "New Entry" : (form.site || "Edit Entry")}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl border border-border bg-background/40 hover:bg-muted/60 transition-all">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Site */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Site / App</label>
            <input value={form.site} onChange={e => set("site", e.target.value)} placeholder="GitHub"
              className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
              style={form.site ? { boxShadow: `0 0 0 2px ${accentRing}` } : undefined} />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Username / Email</label>
            <div className="relative">
              <input value={form.username} onChange={e => set("username", e.target.value)} placeholder="user@example.com"
                className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all" />
              <button onClick={() => copyField(form.username, "username")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                {copied === "username" ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="Enter password"
                className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 pr-24 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button onClick={() => onOpenGenerator(pw => set("password", pw))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Generate">
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={() => setShowPw(p => !p)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copyField(form.password, "password")}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  {copied === "password" ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {form.password && (
              <div className="mt-2 space-y-1">
                {strengthBar(score)}
                {label && <p className={`text-xs font-semibold ${color}`}>{label}</p>}
              </div>
            )}
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">URL <span className="normal-case font-normal text-muted-foreground/60">(optional)</span></label>
            <div className="relative">
              <input value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://github.com"
                className={`w-full bg-background/60 border rounded-2xl px-4 py-3 ${form.url ? "pr-10" : ""} text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all ${form.url && !isValidUrl(form.url) ? "border-red-500/50" : "border-border"}`}
                style={form.url ? { boxShadow: isValidUrl(form.url) ? `0 0 0 2px ${accentRing}` : "0 0 0 2px rgba(239,68,68,0.25)" } : undefined}
              />
              {form.url && isValidUrl(form.url) && (
                <button
                  type="button"
                  onClick={() => window.open(normalizeUrl(form.url), "_blank")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title="Open URL"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
            {form.url && !isValidUrl(form.url) && (
              <p className="mt-1.5 text-xs text-red-400">Invalid URL format — won&apos;t open as a link</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Recovery codes, hints, etc."
              rows={3}
              className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none transition-all" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onSave({ ...form, updatedAt: Date.now() })}
              className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
              {isNew ? "Add Entry" : "Save Changes"}
            </button>
            {!isNew && (
              <button onClick={() => onDelete(entry.id)}
                className="p-3 rounded-2xl border border-border bg-background/40 hover:bg-red-500/10 hover:border-red-500/40 transition-all">
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PasswordVaultPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [vaultState, setVaultState] = useState<VaultState>("loading");
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [search, setSearch] = useState("");
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorFillFn, setGeneratorFillFn] = useState<((pw: string) => void) | null>(null);
  const [masterPw, setMasterPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [showMasterPw, setShowMasterPw] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [lockWarning, setLockWarning] = useState(false);
  const [warnSeconds, setWarnSeconds] = useState(30);
  const [importError, setImportError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnCountRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const storedRef = useRef<VaultStorage | null>(null);

  // Theme sync
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Initial load
  useEffect(() => {
    const raw = localStorage.getItem(PV_KEY);
    if (!raw) { setVaultState("create"); return; }
    try { storedRef.current = JSON.parse(raw); setVaultState("locked"); }
    catch { setVaultState("create"); }
  }, []);

  // Auto-lock
  const lockVault = useCallback(() => {
    cryptoKeyRef.current = null;
    setEntries([]);
    setOpenEntryId(null);
    setIsNewEntry(false);
    setShowGenerator(false);
    setLockWarning(false);
    setVaultState("locked");
  }, []);

  const clearLockTimers = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (warnCountRef.current) clearInterval(warnCountRef.current);
    setLockWarning(false);
  }, []);

  const resetLockTimer = useCallback(() => {
    clearLockTimers();
    warnTimerRef.current = setTimeout(() => {
      setLockWarning(true);
      setWarnSeconds(30);
      warnCountRef.current = setInterval(() => setWarnSeconds(s => s - 1), 1000);
      lockTimerRef.current = setTimeout(lockVault, WARN_MS);
    }, LOCK_MS - WARN_MS);
  }, [lockVault, clearLockTimers]);

  useEffect(() => {
    if (vaultState !== "unlocked") return;
    const events = ["mousemove", "keydown", "click", "touchstart"] as const;
    const handler = () => { setLockWarning(false); resetLockTimer(); };
    events.forEach(e => window.addEventListener(e, handler));
    resetLockTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearLockTimers();
    };
  }, [vaultState, resetLockTimer, clearLockTimers]);

  // Crypto helpers
  const saveEntries = useCallback(async (newEntries: PasswordEntry[]) => {
    if (!cryptoKeyRef.current || !storedRef.current) return;
    const payload = JSON.stringify({ entries: newEntries, version: 1 });
    const { iv, ct } = await aesEncrypt(payload, cryptoKeyRef.current);
    const updated: VaultStorage = { ...storedRef.current, iv, ciphertext: ct, updatedAt: Date.now() };
    storedRef.current = updated;
    localStorage.setItem(PV_KEY, JSON.stringify(updated));
    setEntries(newEntries);
  }, []);

  const createVault = async () => {
    if (!masterPw) { setPwError("Please enter a master password."); return; }
    if (masterPw.length < 8) { setPwError("Master password must be at least 8 characters."); return; }
    if (masterPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setIsWorking(true);
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(masterPw, salt);
      const { iv: verifierIv, ct: verifier } = await aesEncrypt("VAULT_OK", key);
      const payload = JSON.stringify({ entries: [], version: 1 });
      const { iv, ct } = await aesEncrypt(payload, key);
      const stored: VaultStorage = { salt: b64(salt), iv, ciphertext: ct, verifierIv, verifier, updatedAt: Date.now() };
      storedRef.current = stored;
      localStorage.setItem(PV_KEY, JSON.stringify(stored));
      cryptoKeyRef.current = key;
      setEntries([]);
      setMasterPw(""); setConfirmPw("");
      setVaultState("unlocked");
    } catch (e) { setPwError("Failed to create vault."); }
    setIsWorking(false);
  };

  const unlockVault = async () => {
    if (!masterPw) { setPwError("Enter your master password."); return; }
    if (!storedRef.current) { setPwError("No vault found."); return; }
    setIsWorking(true);
    try {
      const salt = unb64(storedRef.current.salt);
      const key = await deriveKey(masterPw, salt);
      const check = await aesDecrypt(storedRef.current.verifierIv, storedRef.current.verifier, key);
      if (check !== "VAULT_OK") throw new Error("wrong");
      const payload = await aesDecrypt(storedRef.current.iv, storedRef.current.ciphertext, key);
      const { entries: e } = JSON.parse(payload) as { entries: PasswordEntry[] };
      cryptoKeyRef.current = key;
      setEntries(e);
      setMasterPw("");
      setVaultState("unlocked");
    } catch {
      setPwError("Incorrect master password.");
    }
    setIsWorking(false);
  };

  const exportVault = () => {
    const raw = localStorage.getItem(PV_KEY);
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pv-backup-${new Date().toISOString().split("T")[0]}.pv.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importVault = (file: File) => {
    setImportError("");
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string) as VaultStorage;
        if (!data.salt || !data.iv || !data.ciphertext || !data.verifier) throw new Error("invalid");
        storedRef.current = data;
        localStorage.setItem(PV_KEY, JSON.stringify(data));
        lockVault();
        setVaultState("locked");
      } catch { setImportError("Invalid or corrupted backup file."); }
    };
    reader.readAsText(file);
  };

  const copyEntry = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const addEntry = () => {
    const blank: PasswordEntry = { id: makeId(), site: "", username: "", password: "", url: "", notes: "", createdAt: Date.now(), updatedAt: Date.now() };
    setOpenEntryId(blank.id);
    setIsNewEntry(true);
    setEntries(prev => [...prev, blank]);
  };

  const saveEntry = async (updated: PasswordEntry) => {
    const newEntries = entries.map(e => e.id === updated.id ? updated : e);
    await saveEntries(newEntries);
    setOpenEntryId(null);
    setIsNewEntry(false);
  };

  const deleteEntry = async (id: string) => {
    const newEntries = entries.filter(e => e.id !== id);
    await saveEntries(newEntries);
    setOpenEntryId(null);
  };

  const accent     = theme === "dark" ? "#fbbf24" : "#d97706";
  const accentGlow = theme === "dark" ? "rgba(251,191,36,0.13)" : "rgba(217,119,6,0.12)";
  const accentRing = theme === "dark" ? "rgba(251,191,36,0.32)" : "rgba(217,119,6,0.38)";

  const openEntry = openEntryId ? entries.find(e => e.id === openEntryId) ?? null : null;
  const filtered  = entries.filter(e =>
    !search || [e.site, e.username, e.url].some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (vaultState === "loading") {
    return (
      <div className={`pv-theme-${theme} min-h-screen bg-background flex items-center justify-center`}>
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // ── Create / Unlock ────────────────────────────────────────────────────────
  if (vaultState === "create" || vaultState === "locked") {
    const isCreate = vaultState === "create";
    const { score } = pwStrength(masterPw);

    return (
      <div className={`pv-theme-${theme} min-h-screen bg-background flex flex-col`}>
        {/* Top bar */}
        <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-xl pt-20 md:pt-24">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            <Link href="/projects/creative-stuff"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group">
              <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Creative Stuff</span>
            </Link>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" style={{ color: accent }} />
              <span className="text-sm font-bold text-foreground">Password Vault</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={e => { e.stopPropagation(); document.documentElement.classList.toggle("dark"); }}
              className="p-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 transition-all"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md">

            {/* Page heading — outside the card, large like other creative-stuff pages */}
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 rounded-2xl shrink-0" style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-foreground leading-none">
                  Password <span className="text-muted-foreground">Vault</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {isCreate ? "Create your encrypted vault" : "Enter your master password to unlock"}
                </p>
              </div>
            </div>

            {/* Card */}
            <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-5 sm:p-8">

              <div className="space-y-4">
                {/* Master password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showMasterPw ? "text" : "password"}
                      value={masterPw}
                      onChange={e => { setMasterPw(e.target.value); setPwError(""); }}
                      onKeyDown={e => e.key === "Enter" && (isCreate ? createVault() : unlockVault())}
                      placeholder={isCreate ? "Choose a strong master password" : "Enter your master password"}
                      autoFocus
                      className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                      style={masterPw ? { boxShadow: `0 0 0 2px ${accentRing}` } : undefined}
                    />
                    <button onClick={() => setShowMasterPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                      {showMasterPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isCreate && masterPw && (
                    <div className="mt-2 space-y-1">
                      {strengthBar(score)}
                    </div>
                  )}
                </div>

                {/* Confirm */}
                {isCreate && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showMasterPw ? "text" : "password"}
                      value={confirmPw}
                      onChange={e => { setConfirmPw(e.target.value); setPwError(""); }}
                      onKeyDown={e => e.key === "Enter" && createVault()}
                      placeholder="Repeat master password"
                      className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                    />
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {pwError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {pwError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  onClick={isCreate ? createVault : unlockVault}
                  disabled={isWorking}
                  className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  {isWorking ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Working…
                    </span>
                  ) : isCreate ? "Create Vault" : "Unlock Vault"}
                </button>

                {/* Import + info */}
                {!isCreate && (
                  <div className="text-center">
                    <button onClick={() => importInputRef.current?.click()}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                      Import backup file
                    </button>
                    <input ref={importInputRef} type="file" accept=".json,.pv.json" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) importVault(e.target.files[0]); e.target.value = ""; }} />
                    {importError && <p className="text-xs text-red-400 mt-1">{importError}</p>}
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 rounded-2xl bg-background/40 border border-border">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your master password is <strong className="text-foreground">never stored</strong>. It derives the AES-256 encryption key locally using PBKDF2.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Unlocked Vault ─────────────────────────────────────────────────────────
  return (
    <div className={`pv-theme-${theme} min-h-screen bg-background text-foreground flex flex-col`}
      onClick={() => {}}>

      {/* Top bar */}
      <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-xl pt-20 md:pt-24">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 flex-wrap">
          <Link href="/projects/creative-stuff"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group shrink-0">
            <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Creative Stuff</span>
          </Link>
          <div className="w-px h-4 bg-border hidden sm:block shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <KeyRound className="w-4 h-4" style={{ color: accent }} />
            <span className="text-sm font-bold text-foreground">Password Vault</span>
          </div>

          <div className="flex-1" />

          {/* Search — desktop only */}
          <div className="relative shrink-0 hidden sm:flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-44 bg-background/60 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all" />
          </div>

          {/* Generator — desktop only */}
          <button onClick={() => setShowGenerator(p => !p)}
            className="p-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 transition-all shrink-0 hidden sm:flex"
            style={showGenerator ? { borderColor: accentRing, background: accentGlow } : undefined} title="Password generator">
            <Shuffle className="w-4 h-4" style={showGenerator ? { color: accent } : undefined} />
          </button>

          {/* Export — desktop only */}
          <button onClick={exportVault}
            className="p-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 transition-all shrink-0 hidden sm:flex" title="Export backup">
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Import — desktop only */}
          <button onClick={() => importInputRef.current?.click()}
            className="p-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 transition-all shrink-0 hidden sm:flex" title="Import backup">
            <Upload className="w-4 h-4 text-muted-foreground" />
          </button>
          <input ref={importInputRef} type="file" accept=".json,.pv.json" className="hidden"
            onChange={e => { if (e.target.files?.[0]) importVault(e.target.files[0]); e.target.value = ""; }} />

          {/* Theme toggle */}
          <button onClick={e => { e.stopPropagation(); document.documentElement.classList.toggle("dark"); }}
            className="p-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 transition-all shrink-0">
            {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>

          {/* Lock */}
          <button onClick={lockVault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 text-xs font-semibold text-muted-foreground transition-all shrink-0">
            <Lock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Lock</span>
          </button>

          {/* New entry */}
          <button onClick={addEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", boxShadow: `0 0 20px ${accentGlow}` }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>
        </div>
      </div>

      {/* Auto-lock warning */}
      <AnimatePresence>
        {lockWarning && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Locking due to inactivity in {warnSeconds}s</span>
            </div>
            <button onClick={() => { clearLockTimers(); resetLockTimer(); }} className="text-xs font-semibold underline underline-offset-2 hover:text-amber-300 transition-colors">
              Stay unlocked
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry grid */}
      <div className="flex-1 p-4 sm:p-6">
        {/* Mobile search — only shown below sm breakpoint */}
        <div className="sm:hidden mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="w-full bg-card/40 backdrop-blur-xl border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Info banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-start gap-3 mb-6 p-3 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">AES-256 encrypted.</span>{" "}
            All entries are encrypted in your browser. Your master password is never stored — only held in memory while unlocked. Auto-locks after <span className="text-foreground">5 minutes</span> of inactivity.
          </p>
        </motion.div>

        {entries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm mb-6">No entries yet. Add your first password.</p>
            <button onClick={addEntry} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-semibold hover:scale-105 active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {filtered.map((entry, i) => (
                <motion.div key={entry.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}
                  onClick={() => { setOpenEntryId(entry.id); setIsNewEntry(false); }}
                  className="group relative p-5 rounded-2xl border border-border bg-card/50 backdrop-blur-xl cursor-pointer transition-all duration-300 hover:bg-card/70"
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accentRing)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "")}
                >
                  {/* Subtle gold accent strip on hover */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "linear-gradient(90deg, #d97706, #f59e0b, #d97706)" }} />

                  {/* Top row: avatar + info + copy */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 transition-transform duration-300 group-hover:scale-105"
                        style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", boxShadow: "0 4px 12px rgba(217,119,6,0.30)" }}
                      >
                        {(entry.site || "?").charAt(0).toUpperCase()}
                      </div>
                      {/* Site + username */}
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm truncate leading-tight">{entry.site || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.username || "—"}</p>
                      </div>
                    </div>

                    {/* Copy button with tooltip */}
                    <div className="relative group/copy shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); copyEntry(entry.password, entry.id); }}
                        className="p-2 rounded-xl border border-border bg-background/40 hover:bg-background/80 transition-all"
                        style={copied === entry.id ? { borderColor: "rgba(74,222,128,0.4)" } : undefined}
                      >
                        {copied === entry.id
                          ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                          : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover/copy:text-foreground transition-colors" />}
                      </button>
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/copy:opacity-100 transition-opacity duration-150 z-10">
                        <div className="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}>
                          {copied === entry.id ? "Copied!" : "Copy Password"}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                          style={{ borderTopColor: "hsl(var(--foreground))" }} />
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: masked password + URL */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm tracking-widest text-muted-foreground/70 select-none">••••••••</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {entry.url && isValidUrl(entry.url) && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); window.open(normalizeUrl(entry.url), "_blank"); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all text-xs"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline max-w-[80px] truncate">
                            {(() => { try { return new URL(normalizeUrl(entry.url)).hostname.replace("www.", ""); } catch { return ""; } })()}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && search && (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                No entries match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Entry panel */}
      <AnimatePresence>
        {openEntry && (
          <EntryPanel
            key={openEntry.id}
            entry={openEntry}
            isNew={isNewEntry}
            onSave={saveEntry}
            onDelete={deleteEntry}
            onClose={() => {
              if (isNewEntry) setEntries(prev => prev.filter(e => e.id !== openEntry.id));
              setOpenEntryId(null); setIsNewEntry(false);
            }}
            onOpenGenerator={fn => { setGeneratorFillFn(() => fn); setShowGenerator(true); }}
            accent={accent} accentGlow={accentGlow} accentRing={accentRing}
          />
        )}
      </AnimatePresence>

      {/* Generator panel */}
      <AnimatePresence>
        {showGenerator && (
          <GeneratorPanel
            onClose={() => { setShowGenerator(false); setGeneratorFillFn(null); }}
            onFill={generatorFillFn ?? undefined}
            accent={accent} accentGlow={accentGlow} accentRing={accentRing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
