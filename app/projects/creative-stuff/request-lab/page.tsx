"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Send, ChevronDown, ChevronRight, Plus, Trash2, Copy,
  CheckCheck, Download, Bookmark, X, Menu, Clock, FolderOpen, Folder, FileJson,
  AlertTriangle, Loader2, MoreHorizontal, Edit3, Sun, Moon, Terminal,
  ArrowRight, History, BookOpen,
} from "lucide-react";
import Link from "next/link";
import "./themes.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KeyValue { id: string; key: string; value: string; enabled: boolean; }
type AuthType = "none" | "bearer" | "basic" | "apikey";
interface Auth {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiValue?: string;
  apiIn?: "header" | "query";
}
type BodyType = "none" | "json" | "formdata" | "urlencoded" | "raw";
interface RequestBody {
  type: BodyType;
  json: string;
  raw: string;
  formData: KeyValue[];
  urlencoded: KeyValue[];
}
interface SavedRequest {
  id: string; name: string; method: string; url: string;
  headers: KeyValue[]; params: KeyValue[]; body: RequestBody; auth: Auth;
}
interface Folder { id: string; name: string; requests: SavedRequest[]; collapsed: boolean; }
interface Collection { id: string; name: string; folders: Folder[]; requests: SavedRequest[]; collapsed: boolean; }
interface HistoryEntry {
  id: string; timestamp: number; method: string; url: string;
  statusCode: number | null; duration: number; size: number; request: SavedRequest;
}
interface ResponseData {
  status: number; statusText: string; duration: number; size: number;
  headers: Record<string, string>; body: string; ok: boolean;
}
interface ConsoleLog {
  id: string; timestamp: number;
  type: "sent" | "success" | "error";
  message: string;
}
type RequestTab = "params" | "headers" | "body" | "auth";
type ResponseTab = "pretty" | "raw" | "headers" | "console";
type SidebarView = "collections" | "history";
type ModalType = "curl" | "saveRequest" | "newCollection" | "newFolder" | "rename" | null;
interface RenameTarget {
  kind: "collection" | "folder" | "request";
  collectionId: string; folderId?: string; requestId?: string;
}
interface ContextMenu {
  type: "collection" | "folder" | "request";
  collectionId: string; folderId?: string; requestId?: string;
  x: number; y: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_COLLECTIONS = "rl_collections";
const LS_HISTORY = "rl_history";
const HISTORY_MAX = 50;
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e", POST: "#f59e0b", PUT: "#3b82f6", PATCH: "#a855f7",
  DELETE: "#ef4444", HEAD: "#6b7280", OPTIONS: "#06b6d4",
};

// ─── Utils ───────────────────────────────────────────────────────────────────

function uid(): string {
  const existing = new Set<string>();
  let id: string;
  do { id = Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(""); }
  while (existing.has(id));
  existing.add(id);
  return id;
}

function emptyKV(): KeyValue { return { id: uid(), key: "", value: "", enabled: true }; }

function readCollections(): Collection[] {
  try { return JSON.parse(localStorage.getItem(LS_COLLECTIONS) || "[]"); } catch { return []; }
}
function writeCollections(c: Collection[]) { localStorage.setItem(LS_COLLECTIONS, JSON.stringify(c)); }
function readHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || "[]"); } catch { return []; }
}
function writeHistory(h: HistoryEntry[]) { localStorage.setItem(LS_HISTORY, JSON.stringify(h)); }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return "#22c55e";
  if (code >= 300 && code < 400) return "#3b82f6";
  if (code >= 400 && code < 500) return "#f59e0b";
  return "#ef4444";
}

function statusBg(code: number): string {
  if (code >= 200 && code < 300) return "rgba(34,197,94,0.12)";
  if (code >= 300 && code < 400) return "rgba(59,130,246,0.12)";
  if (code >= 400 && code < 500) return "rgba(245,158,11,0.12)";
  return "rgba(239,68,68,0.12)";
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function syntaxHighlight(raw: string): string {
  let str = raw;
  try { str = JSON.stringify(JSON.parse(raw), null, 2); } catch { return escapeHtml(raw); }
  return escapeHtml(str).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "rl-json-number";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "rl-json-key" : "rl-json-string";
      else if (/true|false/.test(match)) cls = "rl-json-boolean";
      else if (/null/.test(match)) cls = "rl-json-null";
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// ─── cURL Parser ─────────────────────────────────────────────────────────────

function tokenizeCurl(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let i = 0;
  const s = input.replace(/\$'((?:[^'\\]|\\.)*)'/g, (_, inner) => `'${inner}'`);
  while (i < s.length) {
    const ch = s[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; i++; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; i++; continue; }
    if ((ch === " " || ch === "\t") && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = ""; }
      i++; continue;
    }
    current += ch; i++;
  }
  if (current) tokens.push(current);
  return tokens;
}

interface ParsedCurl {
  method: string; url: string; headers: KeyValue[];
  body: RequestBody; auth: Auth; params: KeyValue[];
}

function parseCurl(raw: string): ParsedCurl | null {
  const input = raw.trim().replace(/\\\r?\n/g, " ");
  if (!/^curl\s/i.test(input)) return null;
  const tokens = tokenizeCurl(input);

  let method = "GET";
  let url = "";
  const headerKVs: KeyValue[] = [];
  let bodyStr = "";
  let bodyType: BodyType = "none";
  const formDataKVs: KeyValue[] = [];
  const urlencodedKVs: KeyValue[] = [];
  let basicUser: string | undefined;
  let basicPass: string | undefined;

  const SKIP_NEXT = ["-o", "-O", "--output", "--connect-timeout", "-m", "--max-time", "--proxy", "-e", "--referer", "--user-agent", "-A"];
  const SKIP_FLAG = ["-L", "--location", "-s", "-S", "-v", "--silent", "--verbose", "--compressed", "-i", "--include", "-k", "--insecure", "-g", "--globoff"];

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok === "curl") { i++; continue; }
    if (tok === "-X" || tok === "--request") { method = (tokens[++i] ?? "GET").toUpperCase(); i++; continue; }
    if (tok === "-H" || tok === "--header") {
      const hdr = tokens[++i] ?? "";
      const ci = hdr.indexOf(":");
      if (ci !== -1) headerKVs.push({ id: uid(), key: hdr.slice(0, ci).trim(), value: hdr.slice(ci + 1).trim(), enabled: true });
      i++; continue;
    }
    if (["-d", "--data", "--data-raw", "--data-ascii", "--data-binary"].includes(tok)) {
      bodyStr = tokens[++i] ?? "";
      if (method === "GET") method = "POST";
      bodyType = "json";
      i++; continue;
    }
    if (tok === "--data-urlencode") {
      const pair = tokens[++i] ?? "";
      const ei = pair.indexOf("=");
      urlencodedKVs.push({ id: uid(), key: ei !== -1 ? pair.slice(0, ei) : pair, value: ei !== -1 ? pair.slice(ei + 1) : "", enabled: true });
      if (method === "GET") method = "POST";
      bodyType = "urlencoded";
      i++; continue;
    }
    if (tok === "--json") {
      bodyStr = tokens[++i] ?? "";
      if (method === "GET") method = "POST";
      bodyType = "json";
      if (!headerKVs.find(h => h.key.toLowerCase() === "content-type"))
        headerKVs.push({ id: uid(), key: "Content-Type", value: "application/json", enabled: true });
      if (!headerKVs.find(h => h.key.toLowerCase() === "accept"))
        headerKVs.push({ id: uid(), key: "Accept", value: "application/json", enabled: true });
      i++; continue;
    }
    if (tok === "-F" || tok === "--form") {
      const pair = tokens[++i] ?? "";
      const ei = pair.indexOf("=");
      formDataKVs.push({ id: uid(), key: ei !== -1 ? pair.slice(0, ei) : pair, value: ei !== -1 ? pair.slice(ei + 1) : "", enabled: true });
      if (method === "GET") method = "POST";
      bodyType = "formdata";
      i++; continue;
    }
    if (tok === "-u" || tok === "--user") {
      const creds = tokens[++i] ?? "";
      const ci = creds.indexOf(":");
      basicUser = ci !== -1 ? creds.slice(0, ci) : creds;
      basicPass = ci !== -1 ? creds.slice(ci + 1) : "";
      i++; continue;
    }
    if (tok === "-b" || tok === "--cookie") {
      headerKVs.push({ id: uid(), key: "Cookie", value: tokens[++i] ?? "", enabled: true });
      i++; continue;
    }
    if (SKIP_NEXT.includes(tok)) { i += 2; continue; }
    if (SKIP_FLAG.includes(tok)) { i++; continue; }
    if (/^https?:\/\//i.test(tok) && !url) { url = tok; i++; continue; }
    if (!tok.startsWith("-") && !url && tok !== "curl") { url = tok; i++; continue; }
    i++;
  }

  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const extractedParams: KeyValue[] = [];
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((v, k) => extractedParams.push({ id: uid(), key: k, value: v, enabled: true }));
    url = parsed.origin + parsed.pathname;
  } catch { /* keep url as-is */ }

  let finalBody: RequestBody = { type: "none", json: "", raw: "", formData: [emptyKV()], urlencoded: [emptyKV()] };
  if (bodyType === "formdata" && formDataKVs.length > 0) {
    finalBody = { type: "formdata", json: "", raw: "", formData: [...formDataKVs, emptyKV()], urlencoded: [emptyKV()] };
  } else if (bodyType === "urlencoded" && urlencodedKVs.length > 0) {
    finalBody = { type: "urlencoded", json: "", raw: "", formData: [emptyKV()], urlencoded: [...urlencodedKVs, emptyKV()] };
  } else if (bodyStr) {
    try {
      JSON.parse(bodyStr);
      finalBody = { type: "json", json: bodyStr, raw: "", formData: [emptyKV()], urlencoded: [emptyKV()] };
    } catch {
      if (/^[\w%+.-]+=/.test(bodyStr) && !bodyStr.includes("{")) {
        const usp = new URLSearchParams(bodyStr);
        const rows: KeyValue[] = [];
        usp.forEach((v, k) => rows.push({ id: uid(), key: k, value: v, enabled: true }));
        finalBody = { type: "urlencoded", json: "", raw: "", formData: [emptyKV()], urlencoded: [...rows, emptyKV()] };
      } else {
        finalBody = { type: "raw", json: "", raw: bodyStr, formData: [emptyKV()], urlencoded: [emptyKV()] };
      }
    }
  }

  let auth: Auth = { type: "none" };
  if (basicUser !== undefined) {
    auth = { type: "basic", username: basicUser, password: basicPass ?? "" };
  } else {
    const authHeader = headerKVs.find(h => h.key.toLowerCase() === "authorization");
    if (authHeader) {
      const m = authHeader.value.match(/^Bearer\s+(.+)$/i);
      if (m) {
        auth = { type: "bearer", token: m[1] };
        headerKVs.splice(headerKVs.indexOf(authHeader), 1);
      }
    }
  }

  return {
    method, url,
    headers: headerKVs.length ? [...headerKVs, emptyKV()] : [emptyKV()],
    body: finalBody, auth,
    params: extractedParams.length ? [...extractedParams, emptyKV()] : [emptyKV()],
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RequestLab() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Layout
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>("collections");

  // Request builder
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [requestTab, setRequestTab] = useState<RequestTab>("params");
  const [params, setParams] = useState<KeyValue[]>([emptyKV()]);
  const [reqHeaders, setReqHeaders] = useState<KeyValue[]>([emptyKV()]);
  const [body, setBody] = useState<RequestBody>({ type: "none", json: "", raw: "", formData: [emptyKV()], urlencoded: [emptyKV()] });
  const [auth, setAuth] = useState<Auth>({ type: "none" });
  const [methodOpen, setMethodOpen] = useState(false);
  const [jsonError, setJsonError] = useState(false);

  // Sending
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [responseTab, setResponseTab] = useState<ResponseTab>("pretty");
  const [responseError, setResponseError] = useState<string | null>(null);
  const [corsWarning, setCorsWarning] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

  // Data
  const [collections, setCollections] = useState<Collection[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Modals
  const [modal, setModal] = useState<ModalType>(null);
  const [curlInput, setCurlInput] = useState("");
  const [curlError, setCurlError] = useState("");
  const [saveColId, setSaveColId] = useState<string | null>(null);
  const [saveFoldId, setSaveFoldId] = useState<string | null>(null);
  const [saveReqName, setSaveReqName] = useState("");
  const [newColName, setNewColName] = useState("");
  const [newFolName, setNewFolName] = useState("");
  const [newFolColId, setNewFolColId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Context menus
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null);

  // ── Effects ──
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setCollections(readCollections()); setHistory(readHistory()); }, []);

  useEffect(() => {
    if (body.type === "json") {
      try { JSON.parse(body.json); setJsonError(false); } catch { setJsonError(body.json.trim().length > 0); }
    } else { setJsonError(false); }
  }, [body.json, body.type]);

  // ── Accent ──
  const accent = theme === "dark" ? "#818cf8" : "#4f46e5";
  const accentGlow = theme === "dark" ? "rgba(129,140,248,0.13)" : "rgba(79,70,229,0.10)";

  // ── Helpers ──
  const getCurrentRequest = useCallback((): SavedRequest => ({
    id: uid(), name: "", method, url,
    headers: reqHeaders.filter(h => h.key),
    params: params.filter(p => p.key),
    body, auth,
  }), [method, url, reqHeaders, params, body, auth]);

  function loadRequest(req: SavedRequest) {
    setMethod(req.method);
    setUrl(req.url);
    setReqHeaders(req.headers.length ? [...req.headers, emptyKV()] : [emptyKV()]);
    setParams(req.params.length ? [...req.params, emptyKV()] : [emptyKV()]);
    setBody(req.body);
    setAuth(req.auth);
    setSidebarOpen(false);
    setResponse(null);
    setResponseError(null);
    setCorsWarning(false);
  }

  function addToHistory(info: { method: string; url: string; statusCode: number | null; duration: number; size: number }) {
    const entry: HistoryEntry = { id: uid(), timestamp: Date.now(), ...info, request: getCurrentRequest() };
    const updated = [entry, ...history].slice(0, HISTORY_MAX);
    setHistory(updated);
    writeHistory(updated);
  }

  function addConsoleLog(entry: Omit<ConsoleLog, "id" | "timestamp">) {
    setConsoleLogs(prev => [...prev.slice(-200), { id: uid(), timestamp: Date.now(), ...entry }]);
  }

  // ── Send Request ──
  async function handleSend() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) { setUrlError("Please enter a URL"); return; }
    const fullUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : "https://" + trimmedUrl;
    setUrlError("");
    setIsSending(true);
    setResponse(null);
    setResponseError(null);
    setCorsWarning(false);

    const activeParams = params.filter(p => p.enabled && p.key);
    const qp = new URLSearchParams(activeParams.map(p => [p.key, p.value]));
    const requestUrl = activeParams.length > 0
      ? `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}${qp}`
      : fullUrl;

    const fetchHeaders: Record<string, string> = {};
    reqHeaders.filter(h => h.enabled && h.key).forEach(h => { fetchHeaders[h.key] = h.value; });

    if (auth.type === "bearer" && auth.token)
      fetchHeaders["Authorization"] = `Bearer ${auth.token}`;
    if (auth.type === "basic" && auth.username)
      fetchHeaders["Authorization"] = `Basic ${btoa(`${auth.username}:${auth.password ?? ""}`)}`;
    if (auth.type === "apikey" && auth.apiKey && auth.apiIn === "header")
      fetchHeaders[auth.apiKey] = auth.apiValue ?? "";

    let apiKeyParams = "";
    if (auth.type === "apikey" && auth.apiKey && auth.apiIn === "query") {
      const kp = new URLSearchParams([[auth.apiKey, auth.apiValue ?? ""]]);
      apiKeyParams = (requestUrl.includes("?") ? "&" : "?") + kp.toString();
    }

    let fetchBody: BodyInit | undefined;
    if (!["GET", "HEAD"].includes(method)) {
      if (body.type === "json" && body.json.trim()) {
        if (!fetchHeaders["Content-Type"]) fetchHeaders["Content-Type"] = "application/json";
        fetchBody = body.json;
      } else if (body.type === "urlencoded") {
        fetchHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        const usp = new URLSearchParams();
        body.urlencoded.filter(r => r.enabled && r.key).forEach(r => usp.append(r.key, r.value));
        fetchBody = usp.toString();
      } else if (body.type === "formdata") {
        const fd = new FormData();
        body.formData.filter(r => r.enabled && r.key).forEach(r => fd.append(r.key, r.value));
        fetchBody = fd;
      } else if (body.type === "raw" && body.raw) {
        fetchBody = body.raw;
      }
    }

    const finalUrl = requestUrl + apiKeyParams;
    addConsoleLog({ type: "sent", message: `→ ${method} ${finalUrl}` });

    const t0 = Date.now();
    try {
      const res = await fetch(finalUrl, { method, headers: fetchHeaders, body: fetchBody });
      const duration = Date.now() - t0;
      let text = await res.text();
      if (text.length > 500_000) text = text.slice(0, 500_000) + "\n\n[Response truncated at 500 KB]";
      const size = new TextEncoder().encode(text).length;
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      setResponse({ status: res.status, statusText: res.statusText, duration, size, headers: resHeaders, body: text, ok: res.ok });
      setResponseTab("pretty");
      addConsoleLog({ type: "success", message: `← ${res.status} ${res.statusText}  ${duration}ms  ${formatBytes(size)}` });
      addToHistory({ method, url: finalUrl, statusCode: res.status, duration, size });
    } catch (err: unknown) {
      const duration = Date.now() - t0;
      const msg = err instanceof Error ? err.message : String(err);
      const isCors = /failed to fetch|load failed|network/i.test(msg);
      if (isCors) {
        setCorsWarning(true);
        setResponseError("Request failed — likely a CORS error. The server does not allow requests from this origin. Try a CORS proxy or test from the same origin.");
      } else {
        setResponseError(`Request failed: ${msg}`);
      }
      addConsoleLog({ type: "error", message: `✗ ${msg}` });
      addToHistory({ method, url: finalUrl, statusCode: null, duration, size: 0 });
    } finally {
      setIsSending(false);
    }
  }

  // ── Collections CRUD ──
  function addCollection(name: string) {
    const c: Collection = { id: uid(), name, folders: [], requests: [], collapsed: false };
    const u = [...collections, c]; setCollections(u); writeCollections(u);
  }
  function deleteCollection(id: string) {
    const u = collections.filter(c => c.id !== id); setCollections(u); writeCollections(u);
  }
  function renameCollection(id: string, name: string) {
    const u = collections.map(c => c.id === id ? { ...c, name } : c); setCollections(u); writeCollections(u);
  }
  function toggleCollection(id: string) {
    const u = collections.map(c => c.id === id ? { ...c, collapsed: !c.collapsed } : c); setCollections(u); writeCollections(u);
  }
  function addFolder(collectionId: string, name: string) {
    const u = collections.map(c => c.id === collectionId
      ? { ...c, folders: [...c.folders, { id: uid(), name, requests: [], collapsed: false }] } : c);
    setCollections(u); writeCollections(u);
  }
  function deleteFolder(collectionId: string, folderId: string) {
    const u = collections.map(c => c.id === collectionId
      ? { ...c, folders: c.folders.filter(f => f.id !== folderId) } : c);
    setCollections(u); writeCollections(u);
  }
  function renameFolder(collectionId: string, folderId: string, name: string) {
    const u = collections.map(c => c.id === collectionId
      ? { ...c, folders: c.folders.map(f => f.id === folderId ? { ...f, name } : f) } : c);
    setCollections(u); writeCollections(u);
  }
  function toggleFolder(collectionId: string, folderId: string) {
    const u = collections.map(c => c.id === collectionId
      ? { ...c, folders: c.folders.map(f => f.id === folderId ? { ...f, collapsed: !f.collapsed } : f) } : c);
    setCollections(u); writeCollections(u);
  }
  function saveRequest(collectionId: string, folderId: string | null, name: string) {
    const trimmedUrl = url.trim();
    const reqName = name.trim() || `${method} ${(() => { try { return new URL(/^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : "https://" + trimmedUrl).hostname; } catch { return trimmedUrl || "request"; } })()}`;
    const req: SavedRequest = { id: uid(), name: reqName, method, url: trimmedUrl, headers: reqHeaders.filter(h => h.key), params: params.filter(p => p.key), body, auth };
    const u = collections.map(c => {
      if (c.id !== collectionId) return c;
      if (folderId) return { ...c, folders: c.folders.map(f => f.id === folderId ? { ...f, requests: [...f.requests, req] } : f) };
      return { ...c, requests: [...c.requests, req] };
    });
    setCollections(u); writeCollections(u);
  }
  function deleteRequest(collectionId: string, folderId: string | undefined, requestId: string) {
    const u = collections.map(c => {
      if (c.id !== collectionId) return c;
      if (folderId) return { ...c, folders: c.folders.map(f => f.id === folderId ? { ...f, requests: f.requests.filter(r => r.id !== requestId) } : f) };
      return { ...c, requests: c.requests.filter(r => r.id !== requestId) };
    });
    setCollections(u); writeCollections(u);
  }
  function renameRequest(collectionId: string, folderId: string | undefined, requestId: string, name: string) {
    const u = collections.map(c => {
      if (c.id !== collectionId) return c;
      if (folderId) return { ...c, folders: c.folders.map(f => f.id === folderId ? { ...f, requests: f.requests.map(r => r.id === requestId ? { ...r, name } : r) } : f) };
      return { ...c, requests: c.requests.map(r => r.id === requestId ? { ...r, name } : r) };
    });
    setCollections(u); writeCollections(u);
  }
  function duplicateRequest(collectionId: string, folderId: string | undefined, requestId: string) {
    const u = collections.map(c => {
      if (c.id !== collectionId) return c;
      if (folderId) return { ...c, folders: c.folders.map(f => { if (f.id !== folderId) return f; const idx = f.requests.findIndex(r => r.id === requestId); if (idx === -1) return f; const dup = { ...f.requests[idx], id: uid(), name: f.requests[idx].name + " (copy)" }; const reqs = [...f.requests]; reqs.splice(idx + 1, 0, dup); return { ...f, requests: reqs }; }) };
      const idx = c.requests.findIndex(r => r.id === requestId);
      if (idx === -1) return c;
      const dup = { ...c.requests[idx], id: uid(), name: c.requests[idx].name + " (copy)" };
      const reqs = [...c.requests]; reqs.splice(idx + 1, 0, dup);
      return { ...c, requests: reqs };
    });
    setCollections(u); writeCollections(u);
  }
  function exportCollection(col: Collection) {
    const blob = new Blob([JSON.stringify(col, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl; a.download = `${col.name.replace(/\s+/g, "-").toLowerCase()}-collection.json`;
    a.click(); URL.revokeObjectURL(objectUrl);
  }

  // ── KeyValue Table ──
  function KVTable({ rows, onChange }: { rows: KeyValue[]; onChange: (r: KeyValue[]) => void }) {
    function update(id: string, field: keyof KeyValue, value: string | boolean) {
      let updated = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
      const last = updated[updated.length - 1];
      if (last && (field === "key" || field === "value") && last.key && updated.length === rows.length)
        updated = [...updated, emptyKV()];
      onChange(updated);
    }
    function remove(id: string) {
      if (rows.length === 1) { onChange([emptyKV()]); return; }
      onChange(rows.filter(r => r.id !== id));
    }
    return (
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <input type="checkbox" checked={row.enabled} onChange={e => update(row.id, "enabled", e.target.checked)}
              className="w-4 h-4 rounded shrink-0 cursor-pointer accent-indigo-500" />
            <input value={row.key} onChange={e => update(row.id, "key", e.target.value)} placeholder="Key"
              className="flex-1 min-w-0 bg-background/60 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
              style={{ "--tw-ring-color": accent } as React.CSSProperties} />
            <input value={row.value} onChange={e => update(row.id, "value", e.target.value)} placeholder="Value"
              className="flex-1 min-w-0 bg-background/60 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
              style={{ "--tw-ring-color": accent } as React.CSSProperties} />
            <button onClick={() => remove(row.id)} className="shrink-0 p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button onClick={() => onChange([...rows, emptyKV()])}
          className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <Plus className="w-3.5 h-3.5" /> Add row
        </button>
      </div>
    );
  }

  // ── Sidebar Content ──
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab switcher */}
        <div className="flex shrink-0 border-b border-border">
          {([["collections", BookOpen, "Collections"], ["history", History, "History"]] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setSidebarView(v)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all border-b-2"
              style={{ borderColor: sidebarView === v ? accent : "transparent", color: sidebarView === v ? accent : undefined }}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {sidebarView === "collections" ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Collections</span>
              <button onClick={() => { setNewColName(""); setModal("newCollection"); }}
                className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all" title="New collection">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground opacity-50 px-4 text-center">
                  <FolderOpen className="w-7 h-7" />
                  <p className="text-sm">No collections yet</p>
                </div>
              ) : collections.map(col => (
                <div key={col.id}>
                  <div className="group flex items-center gap-1 px-2 py-1.5 hover:bg-muted/40 transition-all cursor-pointer relative"
                    onClick={() => toggleCollection(col.id)}>
                    {col.collapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                    <FolderOpen className="w-4 h-4 shrink-0" style={{ color: accent }} />
                    <span className="flex-1 text-sm font-medium truncate">{col.name}</span>
                    <button onClick={e => { e.stopPropagation(); setCtxMenu({ type: "collection", collectionId: col.id, x: e.clientX, y: e.clientY }); }}
                      className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {!col.collapsed && (
                    <div className="pl-3">
                      {col.requests.map(req => (
                        <div key={req.id} className="group flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 transition-all cursor-pointer rounded mx-1"
                          onClick={() => loadRequest(req)}>
                          <span className="text-xs font-bold shrink-0 w-9 text-right" style={{ color: METHOD_COLORS[req.method] ?? "#6b7280" }}>{req.method}</span>
                          <span className="flex-1 text-sm truncate text-muted-foreground hover:text-foreground">{req.name}</span>
                          <button onClick={e => { e.stopPropagation(); setCtxMenu({ type: "request", collectionId: col.id, requestId: req.id, x: e.clientX, y: e.clientY }); }}
                            className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {col.folders.map(fold => (
                        <div key={fold.id}>
                          <div className="group flex items-center gap-1 px-2 py-1.5 hover:bg-muted/40 transition-all cursor-pointer rounded mx-1"
                            onClick={() => toggleFolder(col.id, fold.id)}>
                            {fold.collapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                            <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-sm truncate">{fold.name}</span>
                            <button onClick={e => { e.stopPropagation(); setCtxMenu({ type: "folder", collectionId: col.id, folderId: fold.id, x: e.clientX, y: e.clientY }); }}
                              className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {!fold.collapsed && (
                            <div className="pl-4">
                              {fold.requests.map(req => (
                                <div key={req.id} className="group flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 transition-all cursor-pointer rounded mx-1"
                                  onClick={() => loadRequest(req)}>
                                  <span className="text-xs font-bold shrink-0 w-9 text-right" style={{ color: METHOD_COLORS[req.method] ?? "#6b7280" }}>{req.method}</span>
                                  <span className="flex-1 text-sm truncate text-muted-foreground hover:text-foreground">{req.name}</span>
                                  <button onClick={e => { e.stopPropagation(); setCtxMenu({ type: "request", collectionId: col.id, folderId: fold.id, requestId: req.id, x: e.clientX, y: e.clientY }); }}
                                    className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {fold.requests.length === 0 && (
                                <p className="text-sm text-muted-foreground px-3 py-1 italic">Empty folder</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">History</span>
              {history.length > 0 && (
                <button onClick={() => { const u: HistoryEntry[] = []; setHistory(u); writeHistory(u); }}
                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors">Clear all</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground opacity-50 px-4 text-center">
                  <Clock className="w-7 h-7" />
                  <p className="text-sm">No history yet</p>
                </div>
              ) : history.map(entry => (
                <div key={entry.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-all cursor-pointer"
                  onClick={() => loadRequest(entry.request)}>
                  <span className="text-xs font-bold shrink-0 w-10 text-right" style={{ color: METHOD_COLORS[entry.method] ?? "#6b7280" }}>{entry.method}</span>
                  <span className="flex-1 text-sm truncate text-muted-foreground">{(() => { try { return new URL(entry.url).pathname || entry.url; } catch { return entry.url; } })()}</span>
                  {entry.statusCode !== null ? (
                    <span className="text-xs font-mono shrink-0 px-1 rounded" style={{ color: statusColor(entry.statusCode), background: statusBg(entry.statusCode) }}>{entry.statusCode}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`rl-theme-${theme} h-screen bg-background text-foreground flex flex-col overflow-hidden`}
      onClick={() => { setMethodOpen(false); setCtxMenu(null); }}>

      {/* ── HEADER ── */}
      <header className="shrink-0 border-b border-border bg-card/60 backdrop-blur-xl" style={{ paddingTop: "5rem" }}>
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 flex-wrap">
          <Link href="/projects/creative-stuff" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" /><span className="hidden sm:inline">Back</span>
          </Link>
          <div className="w-px h-4 bg-border mx-1" />
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" style={{ color: accent }} />
            <span className="font-bold text-base">RequestLab</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => { setCurlInput(""); setCurlError(""); setModal("curl"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-border bg-card/60 hover:bg-muted/60 transition-all text-muted-foreground hover:text-foreground">
            <Terminal className="w-4 h-4" />Import cURL
          </button>
          <button onClick={() => { setSaveReqName(""); setSaveColId(collections[0]?.id ?? null); setSaveFoldId(null); setModal("saveRequest"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-border bg-card/60 hover:bg-muted/60 transition-all text-muted-foreground hover:text-foreground">
            <Bookmark className="w-4 h-4" />Save
          </button>
          <button onClick={() => document.documentElement.classList.toggle("dark")}
            className="p-2 rounded-xl border border-border bg-card/60 hover:bg-muted/60 transition-all text-muted-foreground hover:text-foreground"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card/40 backdrop-blur-xl overflow-hidden">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setSidebarOpen(false)} />
              <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-40 w-72 bg-card/95 backdrop-blur-2xl border-r border-border md:hidden flex flex-col overflow-hidden"
                style={{ paddingTop: "5rem" }}>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main panel */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* ── REQUEST BUILDER ── */}
          <div className="flex flex-col border-b border-border" style={{ flex: "0 0 50%", minHeight: 0 }}>

            {/* URL Bar */}
            <div className="shrink-0 flex items-center gap-2 p-2 sm:p-3 border-b border-border">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg border border-border hover:bg-muted/60 transition-all shrink-0">
                <Menu className="w-4 h-4" />
              </button>
              {/* Method dropdown */}
              <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => setMethodOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card/60 hover:bg-muted/60 transition-all text-sm font-bold"
                  style={{ color: METHOD_COLORS[method] ?? "#6b7280" }}>
                  <span>{method}</span><ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {methodOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-36">
                      {METHODS.map(m => (
                        <button key={m} onClick={() => { setMethod(m); setMethodOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold hover:bg-muted/60 transition-all"
                          style={{ color: METHOD_COLORS[m] }}>
                          {m}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* URL input */}
              <div className="flex-1 min-w-0">
                <input value={url} onChange={e => { setUrl(e.target.value); setUrlError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="https://api.example.com/endpoint"
                  className="w-full bg-background/60 border border-border rounded-xl px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                  style={{ borderColor: urlError ? "#ef4444" : undefined, "--tw-ring-color": accent } as React.CSSProperties} />
                {urlError && <p className="text-sm text-red-400 mt-0.5 px-1">{urlError}</p>}
              </div>
              {/* Send button */}
              <button onClick={handleSend} disabled={isSending}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">{isSending ? "Sending…" : "Send"}</span>
              </button>
            </div>

            {/* Request tabs */}
            <div className="shrink-0 flex items-center gap-0.5 px-3 pt-2 pb-0 border-b border-border">
              {(["params", "headers", "body", "auth"] as RequestTab[]).map(tab => {
                const count = tab === "params" ? params.filter(p => p.enabled && p.key).length
                  : tab === "headers" ? reqHeaders.filter(h => h.enabled && h.key).length
                  : tab === "auth" ? (auth.type !== "none" ? 1 : 0) : 0;
                return (
                  <button key={tab} onClick={() => setRequestTab(tab)}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border-b-2 transition-all capitalize"
                    style={{ borderColor: requestTab === tab ? accent : "transparent", color: requestTab === tab ? accent : undefined }}>
                    {tab}
                    {count > 0 && <span className="text-[10px] font-bold px-1 rounded-full" style={{ background: accentGlow, color: accent }}>{count}</span>}
                    {tab === "body" && jsonError && <span className="text-[10px] text-amber-400 font-bold">⚠</span>}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-3">
              {requestTab === "params" && <KVTable rows={params} onChange={setParams} />}
              {requestTab === "headers" && <KVTable rows={reqHeaders} onChange={setReqHeaders} />}
              {requestTab === "body" && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(["none", "json", "formdata", "urlencoded", "raw"] as BodyType[]).map(t => (
                      <button key={t} onClick={() => setBody(b => ({ ...b, type: t }))}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                        style={body.type === t ? { background: accentGlow, color: accent, borderColor: accent } : { borderColor: "transparent" }}>
                        {t === "formdata" ? "Form Data" : t === "urlencoded" ? "URL Encoded" : t === "none" ? "None" : t === "json" ? "JSON" : "Raw"}
                      </button>
                    ))}
                  </div>
                  {body.type === "none" && <p className="text-sm text-muted-foreground italic">This request has no body.</p>}
                  {body.type === "json" && (
                    <div className="relative">
                      <textarea value={body.json} onChange={e => setBody(b => ({ ...b, json: e.target.value }))}
                        placeholder={'{\n  "key": "value"\n}'}
                        className="w-full min-h-[120px] font-mono text-sm bg-background/60 border rounded-xl p-3 pr-20 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all leading-relaxed"
                        style={{ borderColor: jsonError ? "#f59e0b" : undefined, "--tw-ring-color": accent } as React.CSSProperties} />
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        {jsonError && <span className="text-[10px] text-amber-400 font-bold">⚠ Invalid JSON</span>}
                        {!jsonError && body.json.trim() && (
                          <button
                            onClick={() => { try { setBody(b => ({ ...b, json: JSON.stringify(JSON.parse(b.json), null, 2) })); } catch { /* invalid */ } }}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all"
                            style={{ color: accent, borderColor: accent, background: accentGlow }}>
                            Prettify
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {body.type === "formdata" && <KVTable rows={body.formData} onChange={fd => setBody(b => ({ ...b, formData: fd }))} />}
                  {body.type === "urlencoded" && <KVTable rows={body.urlencoded} onChange={ul => setBody(b => ({ ...b, urlencoded: ul }))} />}
                  {body.type === "raw" && (
                    <textarea value={body.raw} onChange={e => setBody(b => ({ ...b, raw: e.target.value }))}
                      placeholder="Raw request body..."
                      className="w-full min-h-[120px] font-mono text-sm bg-background/60 border border-border rounded-xl p-3 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all leading-relaxed"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                  )}
                </div>
              )}
              {requestTab === "auth" && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {(["none", "bearer", "basic", "apikey"] as AuthType[]).map(t => (
                      <button key={t} onClick={() => setAuth(a => ({ ...a, type: t }))}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                        style={auth.type === t ? { background: accentGlow, color: accent, borderColor: accent } : { borderColor: "transparent" }}>
                        {t === "bearer" ? "Bearer Token" : t === "basic" ? "Basic Auth" : t === "apikey" ? "API Key" : "No Auth"}
                      </button>
                    ))}
                  </div>
                  {auth.type === "bearer" && (
                    <input value={auth.token ?? ""} onChange={e => setAuth(a => ({ ...a, token: e.target.value }))}
                      placeholder="Bearer token" type="password"
                      className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                      style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                  )}
                  {auth.type === "basic" && (
                    <div className="flex flex-col gap-2">
                      <input value={auth.username ?? ""} onChange={e => setAuth(a => ({ ...a, username: e.target.value }))}
                        placeholder="Username"
                        className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                      <input value={auth.password ?? ""} onChange={e => setAuth(a => ({ ...a, password: e.target.value }))}
                        placeholder="Password" type="password"
                        className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                    </div>
                  )}
                  {auth.type === "apikey" && (
                    <div className="flex flex-col gap-2">
                      <input value={auth.apiKey ?? ""} onChange={e => setAuth(a => ({ ...a, apiKey: e.target.value }))}
                        placeholder="Key name (e.g. X-API-Key)"
                        className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                      <input value={auth.apiValue ?? ""} onChange={e => setAuth(a => ({ ...a, apiValue: e.target.value }))}
                        placeholder="Key value" type="password"
                        className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                        style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                      <div className="flex gap-2">
                        {(["header", "query"] as const).map(placement => (
                          <button key={placement} onClick={() => setAuth(a => ({ ...a, apiIn: placement }))}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all capitalize"
                            style={(auth.apiIn ?? "header") === placement ? { background: accentGlow, color: accent, borderColor: accent } : { borderColor: "transparent" }}>
                            Add to {placement}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RESPONSE PANEL ── */}
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* CORS warning */}
            <AnimatePresence>
              {corsWarning && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 flex items-start gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>CORS error — the server does not allow requests from this origin. Try using a CORS proxy or test via a local dev environment.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status bar */}
            {response && (
              <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-card/30">
                <span className="px-2 py-0.5 rounded-md text-sm font-bold font-mono"
                  style={{ color: statusColor(response.status), background: statusBg(response.status) }}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-sm text-muted-foreground">{response.duration}ms</span>
                <span className="text-sm text-muted-foreground">{formatBytes(response.size)}</span>
                <div className="flex-1" />
                <button onClick={() => { navigator.clipboard.writeText(response.body); setCopied("response"); setTimeout(() => setCopied(null), 2000); }}
                  className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all" title="Copy response">
                  {copied === "response" ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Response tabs — always visible */}
            <div className="shrink-0 flex items-center gap-0.5 px-3 border-b border-border">
              {(["pretty", "raw", "headers", "console"] as ResponseTab[]).map(tab => (
                <button key={tab} onClick={() => setResponseTab(tab)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border-b-2 transition-all capitalize"
                  style={{ borderColor: responseTab === tab ? accent : "transparent", color: responseTab === tab ? accent : undefined }}>
                  {tab}
                  {tab === "console" && consoleLogs.length > 0 && (
                    <span className="text-[10px] font-bold px-1 rounded-full" style={{ background: accentGlow, color: accent }}>{consoleLogs.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Response body */}
            <div className="flex-1 overflow-auto p-3">
              {/* Console tab */}
              {responseTab === "console" && (
                <div className="flex flex-col h-full">
                  {consoleLogs.length > 0 && (
                    <div className="flex justify-end mb-2 shrink-0">
                      <button onClick={() => setConsoleLogs([])} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">Clear</button>
                    </div>
                  )}
                  {consoleLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground opacity-40">
                      <Terminal className="w-9 h-9" />
                      <p className="text-sm">No requests yet — logs will appear here</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {consoleLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 py-0.5">
                          <span className="shrink-0 text-xs text-muted-foreground/50 font-mono mt-0.5">{formatTime(log.timestamp)}</span>
                          <span className="text-sm font-mono break-all" style={{
                            color: log.type === "sent" ? accent : log.type === "success" ? "#22c55e" : "#ef4444"
                          }}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pretty / Raw / Headers tabs */}
              {responseTab !== "console" && !response && !isSending && !responseError && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground opacity-40">
                  <Send className="w-10 h-10" />
                  <p className="text-sm">Hit Send to see the response</p>
                </div>
              )}
              {responseTab !== "console" && isSending && (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} />
                  <span className="text-sm">Sending request…</span>
                </div>
              )}
              {responseTab !== "console" && responseError && !corsWarning && (
                <div className="flex items-start gap-2 text-red-400 text-sm p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{responseError}
                </div>
              )}
              {responseTab !== "console" && responseError && corsWarning && !response && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground opacity-60">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <p className="text-sm text-amber-400">Request blocked by CORS policy</p>
                </div>
              )}
              {response && responseTab === "pretty" && (
                <pre className="text-sm leading-relaxed whitespace-pre-wrap break-all font-mono"
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(response.body) }} />
              )}
              {response && responseTab === "raw" && (
                <pre className="text-sm leading-relaxed whitespace-pre-wrap break-all font-mono text-foreground">{response.body}</pre>
              )}
              {response && responseTab === "headers" && (
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(response.headers).map(([k, v]) => (
                      <tr key={k} className="border-b border-border/40">
                        <td className="py-1.5 pr-4 font-semibold text-muted-foreground whitespace-nowrap align-top">{k}</td>
                        <td className="py-1.5 font-mono break-all">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEXT MENU ── */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1 w-48"
            style={{ left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 220) }}
            onClick={e => e.stopPropagation()}>
            {ctxMenu.type === "collection" && (<>
              <CtxItem icon={Edit3} label="Rename" onClick={() => { const c = collections.find(c => c.id === ctxMenu.collectionId); setRenameTarget({ kind: "collection", collectionId: ctxMenu.collectionId }); setRenameValue(c?.name ?? ""); setModal("rename"); setCtxMenu(null); }} />
              <CtxItem icon={Folder} label="New Folder" onClick={() => { setNewFolName(""); setNewFolColId(ctxMenu.collectionId); setModal("newFolder"); setCtxMenu(null); }} />
              <CtxItem icon={FileJson} label="New Request" onClick={() => { setSaveReqName(""); setSaveColId(ctxMenu.collectionId); setSaveFoldId(null); setModal("saveRequest"); setCtxMenu(null); }} />
              <CtxItem icon={Download} label="Export JSON" onClick={() => { const c = collections.find(c => c.id === ctxMenu.collectionId); if (c) exportCollection(c); setCtxMenu(null); }} />
              <div className="my-1 border-t border-border/50" />
              <CtxItem icon={Trash2} label="Delete" danger onClick={() => { deleteCollection(ctxMenu.collectionId); setCtxMenu(null); }} />
            </>)}
            {ctxMenu.type === "folder" && (<>
              <CtxItem icon={Edit3} label="Rename" onClick={() => { const c = collections.find(c => c.id === ctxMenu.collectionId); const f = c?.folders.find(f => f.id === ctxMenu.folderId); setRenameTarget({ kind: "folder", collectionId: ctxMenu.collectionId, folderId: ctxMenu.folderId }); setRenameValue(f?.name ?? ""); setModal("rename"); setCtxMenu(null); }} />
              <CtxItem icon={FileJson} label="New Request" onClick={() => { setSaveReqName(""); setSaveColId(ctxMenu.collectionId); setSaveFoldId(ctxMenu.folderId ?? null); setModal("saveRequest"); setCtxMenu(null); }} />
              <div className="my-1 border-t border-border/50" />
              <CtxItem icon={Trash2} label="Delete" danger onClick={() => { if (ctxMenu.folderId) deleteFolder(ctxMenu.collectionId, ctxMenu.folderId); setCtxMenu(null); }} />
            </>)}
            {ctxMenu.type === "request" && (<>
              <CtxItem icon={Send} label="Load" onClick={() => { const c = collections.find(c => c.id === ctxMenu.collectionId); const req = ctxMenu.folderId ? c?.folders.find(f => f.id === ctxMenu.folderId)?.requests.find(r => r.id === ctxMenu.requestId) : c?.requests.find(r => r.id === ctxMenu.requestId); if (req) loadRequest(req); setCtxMenu(null); }} />
              <CtxItem icon={Edit3} label="Rename" onClick={() => { const c = collections.find(c => c.id === ctxMenu.collectionId); const req = ctxMenu.folderId ? c?.folders.find(f => f.id === ctxMenu.folderId)?.requests.find(r => r.id === ctxMenu.requestId) : c?.requests.find(r => r.id === ctxMenu.requestId); setRenameTarget({ kind: "request", collectionId: ctxMenu.collectionId, folderId: ctxMenu.folderId, requestId: ctxMenu.requestId }); setRenameValue(req?.name ?? ""); setModal("rename"); setCtxMenu(null); }} />
              <CtxItem icon={Copy} label="Duplicate" onClick={() => { if (ctxMenu.requestId) duplicateRequest(ctxMenu.collectionId, ctxMenu.folderId, ctxMenu.requestId); setCtxMenu(null); }} />
              <div className="my-1 border-t border-border/50" />
              <CtxItem icon={Trash2} label="Delete" danger onClick={() => { if (ctxMenu.requestId) deleteRequest(ctxMenu.collectionId, ctxMenu.folderId, ctxMenu.requestId); setCtxMenu(null); }} />
            </>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm"
            onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>

              {/* cURL Import */}
              {modal === "curl" && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Terminal className="w-4 h-4" style={{ color: accent }} /><span className="font-semibold">Import cURL</span></div>
                    <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"><X className="w-4 h-4" /></button>
                  </div>
                  <textarea value={curlInput} onChange={e => { setCurlInput(e.target.value); setCurlError(""); }}
                    placeholder={"curl -X POST https://api.example.com/data \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"key\": \"value\"}'"}
                    rows={7}
                    className="w-full font-mono text-sm bg-background/60 border border-border rounded-xl p-3 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all leading-relaxed"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                  {curlError && <p className="text-sm text-red-400">{curlError}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-xl text-sm border border-border hover:bg-muted/60 transition-all text-muted-foreground">Cancel</button>
                    <button onClick={() => {
                      const parsed = parseCurl(curlInput);
                      if (!parsed) { setCurlError("Could not parse this cURL command. Make sure it starts with 'curl' and includes a URL."); return; }
                      setMethod(parsed.method); setUrl(parsed.url); setReqHeaders(parsed.headers);
                      setParams(parsed.params); setBody(parsed.body); setAuth(parsed.auth);
                      setModal(null);
                    }} className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}>
                      Import
                    </button>
                  </div>
                </div>
              )}

              {/* Save Request — collection first, then folder, then name */}
              {modal === "saveRequest" && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><FileJson className="w-4 h-4" style={{ color: accent }} /><span className="font-semibold">Save Request</span></div>
                    <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"><X className="w-4 h-4" /></button>
                  </div>
                  {collections.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic text-center py-2">
                      No collections yet. <button onClick={() => { setNewColName(""); setModal("newCollection"); }} className="underline" style={{ color: accent }}>Create one first.</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-muted-foreground font-medium">Collection</label>
                        <select value={saveColId ?? ""} onChange={e => { setSaveColId(e.target.value); setSaveFoldId(null); }}
                          className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 transition-all"
                          style={{ "--tw-ring-color": accent } as React.CSSProperties}>
                          {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      {saveColId && collections.find(c => c.id === saveColId)?.folders.length ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm text-muted-foreground font-medium">Folder (optional)</label>
                          <select value={saveFoldId ?? ""} onChange={e => setSaveFoldId(e.target.value || null)}
                            className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 transition-all"
                            style={{ "--tw-ring-color": accent } as React.CSSProperties}>
                            <option value="">— No folder (top-level) —</option>
                            {collections.find(c => c.id === saveColId)?.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-muted-foreground font-medium">Request name (optional)</label>
                        <input value={saveReqName} onChange={e => setSaveReqName(e.target.value)} placeholder="e.g. Get user profile"
                          className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                          style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                      </div>
                    </>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-xl text-sm border border-border hover:bg-muted/60 transition-all text-muted-foreground">Cancel</button>
                    <button onClick={() => { if (!saveColId) return; saveRequest(saveColId, saveFoldId, saveReqName); setModal(null); }}
                      disabled={!saveColId}
                      className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}>
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* New Collection */}
              {modal === "newCollection" && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><FolderOpen className="w-4 h-4" style={{ color: accent }} /><span className="font-semibold">New Collection</span></div>
                    <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"><X className="w-4 h-4" /></button>
                  </div>
                  <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Collection name"
                    autoFocus onKeyDown={e => { if (e.key === "Enter" && newColName.trim()) { addCollection(newColName.trim()); setModal(null); } }}
                    className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-xl text-sm border border-border hover:bg-muted/60 transition-all text-muted-foreground">Cancel</button>
                    <button onClick={() => { if (newColName.trim()) { addCollection(newColName.trim()); setModal(null); } }}
                      disabled={!newColName.trim()}
                      className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}>
                      Create
                    </button>
                  </div>
                </div>
              )}

              {/* New Folder */}
              {modal === "newFolder" && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Folder className="w-4 h-4" style={{ color: accent }} /><span className="font-semibold">New Folder</span></div>
                    <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"><X className="w-4 h-4" /></button>
                  </div>
                  <input value={newFolName} onChange={e => setNewFolName(e.target.value)} placeholder="Folder name"
                    autoFocus onKeyDown={e => { if (e.key === "Enter" && newFolName.trim() && newFolColId) { addFolder(newFolColId, newFolName.trim()); setModal(null); } }}
                    className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-xl text-sm border border-border hover:bg-muted/60 transition-all text-muted-foreground">Cancel</button>
                    <button onClick={() => { if (newFolName.trim() && newFolColId) { addFolder(newFolColId, newFolName.trim()); setModal(null); } }}
                      disabled={!newFolName.trim()}
                      className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}>
                      Create
                    </button>
                  </div>
                </div>
              )}

              {/* Rename */}
              {modal === "rename" && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Edit3 className="w-4 h-4" style={{ color: accent }} /><span className="font-semibold">Rename</span></div>
                    <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"><X className="w-4 h-4" /></button>
                  </div>
                  <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter" && renameValue.trim() && renameTarget) {
                        if (renameTarget.kind === "collection") renameCollection(renameTarget.collectionId, renameValue.trim());
                        else if (renameTarget.kind === "folder" && renameTarget.folderId) renameFolder(renameTarget.collectionId, renameTarget.folderId, renameValue.trim());
                        else if (renameTarget.kind === "request" && renameTarget.requestId) renameRequest(renameTarget.collectionId, renameTarget.folderId, renameTarget.requestId, renameValue.trim());
                        setModal(null);
                      }
                    }}
                    className="bg-background/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setModal(null)} className="px-3 py-1.5 rounded-xl text-sm border border-border hover:bg-muted/60 transition-all text-muted-foreground">Cancel</button>
                    <button onClick={() => {
                      if (!renameValue.trim() || !renameTarget) return;
                      if (renameTarget.kind === "collection") renameCollection(renameTarget.collectionId, renameValue.trim());
                      else if (renameTarget.kind === "folder" && renameTarget.folderId) renameFolder(renameTarget.collectionId, renameTarget.folderId, renameValue.trim());
                      else if (renameTarget.kind === "request" && renameTarget.requestId) renameRequest(renameTarget.collectionId, renameTarget.folderId, renameTarget.requestId, renameValue.trim());
                      setModal(null);
                    }} disabled={!renameValue.trim()}
                      className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}>
                      Rename
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Context Menu Item ────────────────────────────────────────────────────────

function CtxItem({ icon: Icon, label, onClick, danger }: { icon: React.FC<{ className?: string }>; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all ${danger ? "text-red-400 hover:bg-red-400/10" : "text-foreground hover:bg-muted/60"}`}>
      <Icon className="w-4 h-4 shrink-0" />{label}
    </button>
  );
}
