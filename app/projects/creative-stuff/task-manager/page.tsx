"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  List, LayoutGrid, Table, Plus, X, Check, ChevronDown, ChevronRight,
  MoreHorizontal, Menu, Trash2, ArrowRight, Calendar, Info,
  AlignLeft, Type, Code, Minus, Hash, ArrowUpDown, ArrowUp, ArrowDown,
  LayoutDashboard, Edit3, Flag, Sun, Moon,
} from "lucide-react";
import Link from "next/link";
import "./themes.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType = "paragraph" | "heading1" | "heading2" | "bullet" | "numbered" | "code" | "divider";
type Status = "todo" | "in-progress" | "done" | "cancelled";
type Priority = "none" | "low" | "medium" | "high" | "urgent";
type View = "list" | "kanban" | "table";
type SortCol = "title" | "status" | "priority" | "dueDate" | "createdAt";

interface TaskBlock { id: string; type: BlockType; content: string; }
interface Board { id: string; name: string; emoji: string; createdAt: number; }
interface Task {
  id: string; boardId: string; title: string; blocks: TaskBlock[];
  status: Status; priority: Priority; dueDate: string | null;
  order: number; createdAt: number; updatedAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOARDS_KEY = "tm_boards";
const TASKS_KEY = "tm_tasks";
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

const STATUSES: { value: Status; label: string; color: string; dot: string }[] = [
  { value: "todo",        label: "To Do",       color: "text-blue-400",   dot: "bg-blue-400" },
  { value: "in-progress", label: "In Progress",  color: "text-yellow-400", dot: "bg-yellow-400" },
  { value: "done",        label: "Done",         color: "text-green-400",  dot: "bg-green-400" },
  { value: "cancelled",   label: "Cancelled",    color: "text-gray-500",   dot: "bg-gray-500" },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "none",   label: "None",   color: "text-muted-foreground" },
  { value: "low",    label: "Low",    color: "text-blue-400" },
  { value: "medium", label: "Medium", color: "text-yellow-400" },
  { value: "high",   label: "High",   color: "text-orange-400" },
  { value: "urgent", label: "Urgent", color: "text-red-400" },
];

const BLOCK_CMDS: { type: BlockType; label: string; desc: string; Icon: React.FC<{ className?: string }> }[] = [
  { type: "paragraph", label: "Text",       desc: "Plain paragraph",   Icon: AlignLeft },
  { type: "heading1",  label: "Heading 1",  desc: "Large heading",     Icon: Type },
  { type: "heading2",  label: "Heading 2",  desc: "Medium heading",    Icon: Type },
  { type: "bullet",    label: "Bullet",     desc: "Bulleted list",     Icon: List },
  { type: "numbered",  label: "Numbered",   desc: "Numbered list",     Icon: Hash },
  { type: "code",      label: "Code",       desc: "Code snippet",      Icon: Code },
  { type: "divider",   label: "Divider",    desc: "Horizontal rule",   Icon: Minus },
];

const EMOJIS = ["📋","🗂️","💼","🏠","🎯","🚀","📚","✅","🌟","💡","🔥","🎨","📝","⚡","🌿"];

// ─── Utils ────────────────────────────────────────────────────────────────────
function makeId(existing?: Set<string>) {
  let id: string;
  do { id = Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(""); }
  while (existing?.has(id));
  return id;
}
function makeBlockId() { return "b_" + Math.random().toString(36).slice(2, 8); }
function tryRead<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function tryWrite(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

function statusMeta(s: Status) { return STATUSES.find(x => x.value === s)!; }
function priorityMeta(p: Priority) { return PRIORITIES.find(x => x.value === p)!; }

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate + "T23:59:59") < new Date();
}
function fmtDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getBlockStyle(type: BlockType): string {
  switch (type) {
    case "heading1": return "text-2xl font-bold text-foreground leading-tight";
    case "heading2": return "text-lg font-semibold text-foreground";
    case "code":     return "font-mono text-sm bg-muted/40 px-3 py-1 rounded-lg border border-border text-foreground";
    default:         return "text-base text-foreground";
  }
}
function getBlockPlaceholder(type: BlockType, isFirst: boolean): string {
  if (type === "heading1") return "Heading 1";
  if (type === "heading2") return "Heading 2";
  if (type === "code")     return "Code...";
  if (type === "bullet" || type === "numbered") return "List item";
  return isFirst ? "Add a description... type / for commands" : "";
}

// ─── BlockEditor ──────────────────────────────────────────────────────────────
function BlockEditor({ initialBlocks, onChange }: { initialBlocks: TaskBlock[]; onChange: (b: TaskBlock[]) => void }) {
  const [blocks, setBlocks] = useState<TaskBlock[]>(() =>
    initialBlocks.length > 0 ? initialBlocks : [{ id: makeBlockId(), type: "paragraph", content: "" }]
  );
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; top: number; left: number } | null>(null);
  const refs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const sync = useCallback((newBlocks: TaskBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
  }, [onChange]);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleChange = (id: string, val: string) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, content: val } : b);
    sync(newBlocks);
    const el = refs.current.get(id);
    autoResize(el || null);
    if (val === "/") {
      if (el) { const r = el.getBoundingClientRect(); setSlashMenu({ blockId: id, top: r.bottom + 6, left: r.left }); }
    } else { setSlashMenu(null); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: TaskBlock, idx: number) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      const nb: TaskBlock = { id: makeBlockId(), type: "paragraph", content: "" };
      const nb2 = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)];
      sync(nb2);
      setTimeout(() => { refs.current.get(nb.id)?.focus(); }, 10);
    }
    if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
      e.preventDefault();
      const prev = blocks[idx - 1];
      sync(blocks.filter(b => b.id !== block.id));
      setTimeout(() => { const el = refs.current.get(prev?.id); el?.focus(); el && (el.selectionStart = el.value.length); }, 10);
    }
    if (e.key === "Escape") setSlashMenu(null);
  };

  const applyCmd = (blockId: string, type: BlockType) => {
    sync(blocks.map(b => b.id === blockId ? { ...b, type, content: "" } : b));
    setSlashMenu(null);
    setTimeout(() => refs.current.get(blockId)?.focus(), 10);
  };

  return (
    <div className="space-y-0.5 relative" onClick={() => setSlashMenu(null)}>
      {blocks.map((block, idx) => {
        if (block.type === "divider") {
          return <div key={block.id} className="py-3"><hr className="border-border" /></div>;
        }
        const numbered = block.type === "numbered"
          ? blocks.slice(0, idx).filter(b => b.type === "numbered").length + 1
          : 0;
        return (
          <div key={block.id} className={`flex gap-2 items-start ${block.type === "bullet" || block.type === "numbered" ? "pl-1" : ""}`}>
            {block.type === "bullet" && <span className="text-muted-foreground mt-2 shrink-0 text-sm">•</span>}
            {block.type === "numbered" && <span className="text-muted-foreground mt-2 shrink-0 text-sm">{numbered}.</span>}
            <textarea
              ref={el => { if (el) { refs.current.set(block.id, el); autoResize(el); } else refs.current.delete(block.id); }}
              value={block.content}
              onChange={e => handleChange(block.id, e.target.value)}
              onKeyDown={e => handleKeyDown(e, block, idx)}
              placeholder={getBlockPlaceholder(block.type, idx === 0)}
              rows={1}
              className={`flex-1 w-full bg-transparent resize-none outline-none border-none overflow-hidden placeholder:text-muted-foreground/40 ${getBlockStyle(block.type)}`}
              onClick={e => e.stopPropagation()}
            />
          </div>
        );
      })}

      <AnimatePresence>
        {slashMenu && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed z-[200] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-2 w-56"
            style={{ top: slashMenu.top, left: slashMenu.left }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-2">Blocks</p>
            {BLOCK_CMDS.map(cmd => (
              <button key={cmd.type} onClick={() => applyCmd(slashMenu.blockId, cmd.type)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 text-sm text-left transition-colors">
                <cmd.Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-foreground font-medium leading-tight">{cmd.label}</div>
                  <div className="text-xs text-muted-foreground">{cmd.desc}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TaskDetailPanel ──────────────────────────────────────────────────────────
function TaskDetailPanel({ task, onUpdate, onClose, accentRing }: {
  task: Task; onUpdate: (t: Task) => void; onClose: () => void; accentRing: string;
}) {
  const [title, setTitle] = useState(task.title);
  const [openDropdown, setOpenDropdown] = useState<"status" | "priority" | null>(null);

  useEffect(() => { setTitle(task.title); }, [task.id, task.title]);

  const upd = (patch: Partial<Task>) => onUpdate({ ...task, ...patch, updatedAt: Date.now() });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/40 backdrop-blur-sm z-20 md:hidden"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-30 w-full md:w-[440px] bg-card/95 backdrop-blur-2xl border-l border-border flex flex-col overflow-hidden"
        style={{ paddingTop: "5rem" }}
      >
        {/* Close */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Task Detail</span>
          <button onClick={onClose} className="p-2 rounded-xl border border-border bg-background/40 hover:bg-muted/60 transition-all">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => upd({ title: title.trim() || "Untitled" })}
            placeholder="Task title…"
            rows={1}
            className="w-full text-2xl font-bold bg-transparent resize-none outline-none border-none text-foreground placeholder:text-muted-foreground/40 overflow-hidden"
            style={{ height: "auto" }}
            onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
          />

          {/* Properties */}
          <div className="grid grid-cols-1 gap-2">
            {/* Status */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(p => p === "status" ? null : "status")}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition-all text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`font-medium ${statusMeta(task.status).color}`}>{statusMeta(task.status).label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {openDropdown === "status" && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden">
                    {STATUSES.map(s => (
                      <button key={s.value} onClick={() => { upd({ status: s.value }); setOpenDropdown(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/60 text-sm transition-colors">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        <span className={s.color}>{s.label}</span>
                        {task.status === s.value && <Check className="w-3.5 h-3.5 ml-auto text-foreground" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Priority */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(p => p === "priority" ? null : "priority")}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition-all text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <span className={`font-medium ${priorityMeta(task.priority).color}`}>{priorityMeta(task.priority).label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {openDropdown === "priority" && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden">
                    {PRIORITIES.map(p => (
                      <button key={p.value} onClick={() => { upd({ priority: p.value }); setOpenDropdown(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/60 text-sm transition-colors">
                        <Flag className="w-3.5 h-3.5 shrink-0" style={{ color: p.value === "none" ? undefined : undefined }} />
                        <span className={p.color}>{p.label}</span>
                        {task.priority === p.value && <Check className="w-3.5 h-3.5 ml-auto text-foreground" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background/40 text-sm">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Due date</span>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={e => upd({ dueDate: e.target.value || null })}
                className="flex-1 bg-transparent outline-none text-foreground text-sm cursor-pointer"
              />
              {task.dueDate && (
                <button onClick={() => upd({ dueDate: null })} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Block editor */}
          <BlockEditor
            key={task.id}
            initialBlocks={task.blocks}
            onChange={blocks => upd({ blocks })}
          />
        </div>
      </motion.aside>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TaskManagerPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [collapsed, setCollapsed] = useState<Set<Status>>(new Set());
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [emojiPickerBoardId, setEmojiPickerBoardId] = useState<string | null>(null);
  const [boardMenuId, setBoardMenuId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardEmoji, setNewBoardEmoji] = useState("📋");

  // Theme sync
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Load data
  useEffect(() => {
    let storedBoards = tryRead<Board[]>(BOARDS_KEY, []);
    let storedTasks = tryRead<Task[]>(TASKS_KEY, []);
    if (storedBoards.length === 0) {
      const defaultBoard: Board = { id: makeId(), name: "Personal", emoji: "📋", createdAt: Date.now() };
      storedBoards = [defaultBoard];
      tryWrite(BOARDS_KEY, storedBoards);
    }
    setBoards(storedBoards);
    setTasks(storedTasks);
    setActiveBoardId(storedBoards[0].id);
  }, []);

  const accent = theme === "dark" ? "#fb7185" : "#e11d48";
  const accentGlow = theme === "dark" ? "rgba(251,113,133,0.13)" : "rgba(225,29,72,0.10)";
  const accentRing = theme === "dark" ? "rgba(251,113,133,0.30)" : "rgba(225,29,72,0.35)";

  const boardTasks = tasks.filter(t => t.boardId === activeBoardId);
  const activeBoard = boards.find(b => b.id === activeBoardId);
  const openTask = tasks.find(t => t.id === openTaskId) ?? null;

  // ── Board CRUD ───────────────────────────────────────────────────────────────
  const createBoard = (name = "Untitled", emoji = "📋") => {
    const ids = new Set(boards.map(b => b.id));
    const b: Board = { id: makeId(ids), name, emoji, createdAt: Date.now() };
    const updated = [...boards, b];
    setBoards(updated); tryWrite(BOARDS_KEY, updated);
    setActiveBoardId(b.id);
  };
  const updateBoard = (id: string, patch: Partial<Board>) => {
    const updated = boards.map(b => b.id === id ? { ...b, ...patch } : b);
    setBoards(updated); tryWrite(BOARDS_KEY, updated);
  };
  const deleteBoard = (id: string) => {
    let updated = boards.filter(b => b.id !== id);
    const updTasks = tasks.filter(t => t.boardId !== id);
    if (updated.length === 0) {
      const def: Board = { id: makeId(new Set()), name: "Personal", emoji: "📋", createdAt: Date.now() };
      updated = [def];
    }
    setBoards(updated); tryWrite(BOARDS_KEY, updated);
    setTasks(updTasks); tryWrite(TASKS_KEY, updTasks);
    if (activeBoardId === id) setActiveBoardId(updated[0].id);
  };

  // ── Task CRUD ────────────────────────────────────────────────────────────────
  const createTask = (status: Status = "todo") => {
    if (!activeBoardId) return;
    const ids = new Set(tasks.map(t => t.id));
    const maxOrder = boardTasks.filter(t => t.status === status).reduce((m, t) => Math.max(m, t.order), -1);
    const t: Task = {
      id: makeId(ids), boardId: activeBoardId, title: "Untitled task",
      blocks: [], status, priority: "none", dueDate: new Date().toISOString().split("T")[0],
      order: maxOrder + 1, createdAt: Date.now(), updatedAt: Date.now(),
    };
    const updated = [...tasks, t];
    setTasks(updated); tryWrite(TASKS_KEY, updated);
    setOpenTaskId(t.id);
  };
  const updateTask = (t: Task) => {
    const updated = tasks.map(x => x.id === t.id ? t : x);
    setTasks(updated); tryWrite(TASKS_KEY, updated);
  };
  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated); tryWrite(TASKS_KEY, updated);
    if (openTaskId === id) setOpenTaskId(null);
  };
  const toggleDone = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    updateTask({ ...t, status: t.status === "done" ? "todo" : "done", updatedAt: Date.now() });
  };

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sorted = [...boardTasks].sort((a, b) => {
    let av: string | number = a[sortCol as keyof Task] as string | number ?? "";
    let bv: string | number = b[sortCol as keyof Task] as string | number ?? "";
    if (sortCol === "priority") {
      const ord = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 };
      av = ord[a.priority]; bv = ord[b.priority];
    }
    if (sortCol === "status") {
      const ord = { todo: 0, "in-progress": 1, done: 2, cancelled: 3 };
      av = ord[a.status]; bv = ord[b.status];
    }
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  // ── Kanban DnD ───────────────────────────────────────────────────────────────
  const onDrop = (status: Status) => {
    if (!draggedId) return;
    const t = tasks.find(x => x.id === draggedId);
    if (t && t.status !== status) updateTask({ ...t, status, updatedAt: Date.now() });
    setDraggedId(null); setDragOverStatus(null);
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Boards</span>
          <button
            onClick={() => { setNewBoardName(""); setNewBoardEmoji("📋"); setShowNewBoardModal(true); }}
            className="p-1 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {boards.map(board => (
          <div key={board.id} className="relative group/board">
            <div
              role="button"
              tabIndex={0}
              onClick={() => { setActiveBoardId(board.id); setSidebarOpen(false); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { setActiveBoardId(board.id); setSidebarOpen(false); } }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer select-none ${activeBoardId === board.id ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
            >
              <span
                className="shrink-0 cursor-pointer"
                onClick={e => { e.stopPropagation(); setEmojiPickerBoardId(board.id === emojiPickerBoardId ? null : board.id); }}
              >{board.emoji}</span>
              <span className="flex-1 truncate text-left">{board.name}</span>
              <button
                onClick={e => { e.stopPropagation(); setBoardMenuId(board.id === boardMenuId ? null : board.id); }}
                className="opacity-0 group-hover/board:opacity-100 p-0.5 rounded hover:bg-muted/80 transition-all shrink-0"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Board menu */}
            <AnimatePresence>
              {boardMenuId === board.id && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-36"
                  onClick={e => e.stopPropagation()}
                >
                  <button onClick={() => { setActiveBoardId(board.id); setEditingBoardId(board.id); setBoardMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 text-foreground transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Rename
                  </button>
                  <button onClick={() => { deleteBoard(board.id); setBoardMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-500/10 text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emoji picker */}
            <AnimatePresence>
              {emojiPickerBoardId === board.id && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute left-8 top-8 z-50 bg-card border border-border rounded-xl shadow-xl p-2 w-44"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="grid grid-cols-5 gap-1">
                    {EMOJIS.map(em => (
                      <button key={em} onClick={() => { updateBoard(board.id, { emoji: em }); setEmojiPickerBoardId(null); }}
                        className="text-lg p-1 rounded-lg hover:bg-muted/60 transition-colors text-center">
                        {em}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Info badge */}
      <div className="px-3 py-3 border-t border-border shrink-0">
        <div className="flex items-start gap-2 p-2 rounded-xl bg-card/60 border border-border">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accent }} />
          <p className="text-xs text-muted-foreground leading-relaxed">Stored in your browser&apos;s localStorage</p>
        </div>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={`tm-theme-${theme} h-screen bg-background text-foreground flex flex-col overflow-hidden`}
      onClick={() => { setBoardMenuId(null); setEmojiPickerBoardId(null); }}
    >
      {/* Full-width top bar */}
      <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-xl pt-20 md:pt-24">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 flex-wrap">
          <Link
            href="/projects/creative-stuff"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group shrink-0"
          >
            <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Creative Stuff</span>
          </Link>
          <div className="w-px h-4 bg-border hidden sm:block shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">Task Manager</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={e => { e.stopPropagation(); document.documentElement.classList.toggle("dark"); }}
            className="p-2 rounded-xl border border-border bg-card/40 hover:bg-muted/60 transition-all shrink-0"
            title="Toggle theme"
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4 text-muted-foreground" />
              : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button
            onClick={() => createTask()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
            style={{ background: "linear-gradient(135deg, #f43f5e, #ec4899)", boxShadow: `0 0 20px ${accentGlow}` }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-card/60 backdrop-blur-xl overflow-hidden">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setSidebarOpen(false)} />
              <motion.aside
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28 }}
                className="fixed left-0 top-0 bottom-0 z-40 w-64 bg-card/95 backdrop-blur-2xl border-r border-border md:hidden"
                style={{ paddingTop: "5rem" }}
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl border border-border hover:bg-muted/60 transition-all shrink-0">
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">{activeBoard?.emoji ?? "📋"}</span>
              {editingBoardId === activeBoardId ? (
                <input
                  autoFocus defaultValue={activeBoard?.name}
                  onBlur={e => { updateBoard(activeBoardId!, { name: e.target.value.trim() || "Untitled" }); setEditingBoardId(null); }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="bg-transparent outline-none text-xl font-bold text-foreground min-w-0 flex-1"
                />
              ) : (
                <h1
                  className="text-xl font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditingBoardId(activeBoardId)}
                >
                  {activeBoard?.name ?? "No board"}
                </h1>
              )}
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-1 bg-card/60 border border-border rounded-xl p-1 shrink-0">
              {([["list", List], ["kanban", LayoutGrid], ["table", Table]] as [View, React.FC<{ className?: string }>][]).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`p-1.5 rounded-lg transition-all ${view === v ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                  style={view === v ? { background: "linear-gradient(135deg, #f43f5e, #ec4899)" } : undefined}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </header>

          {/* View content */}
          <div className="flex-1 overflow-auto">
            {/* ── List View ── */}
            {view === "list" && (
              <div className="p-4 sm:p-6 space-y-4">
                {STATUSES.map(s => {
                  const group = boardTasks.filter(t => t.status === s.value).sort((a, b) => a.order - b.order);
                  const isOpen = !collapsed.has(s.value);
                  return (
                    <div key={s.value} className="rounded-2xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden">
                      <button
                        onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(s.value) ? n.delete(s.value) : n.add(s.value); return n; })}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors"
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                        <span className={`text-sm font-semibold ${s.color}`}>{s.label}</span>
                        <span className="ml-1 text-xs text-muted-foreground">({group.length})</span>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="border-t border-border">
                              {group.map((task, i) => (
                                <motion.div key={task.id}
                                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0 cursor-pointer"
                                  onClick={() => setOpenTaskId(task.id)}
                                >
                                  <button
                                    onClick={e => { e.stopPropagation(); toggleDone(task.id); }}
                                    className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all ${task.status === "done" ? "border-green-500 bg-green-500/20" : "border-border hover:border-primary"}`}
                                  >
                                    {task.status === "done" && <Check className="w-3 h-3 text-green-400" />}
                                  </button>

                                  <span className={`flex-1 text-sm text-foreground truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                  </span>

                                  {task.priority !== "none" && (
                                    <span className={`hidden sm:inline text-xs font-medium ${priorityMeta(task.priority).color}`}>
                                      {priorityMeta(task.priority).label}
                                    </span>
                                  )}

                                  {task.dueDate && (
                                    <span className={`hidden sm:inline text-xs ${isOverdue(task.dueDate) ? "text-red-400" : "text-muted-foreground"}`}>
                                      {fmtDate(task.dueDate)}
                                    </span>
                                  )}

                                  <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </motion.div>
                              ))}
                              <button
                                onClick={() => createTask(s.value)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                              >
                                <Plus className="w-4 h-4" /> Add task
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {boardTasks.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <LayoutDashboard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm mb-4">No tasks yet. Create your first task.</p>
                    <button onClick={() => createTask()} className="px-5 py-2.5 rounded-2xl text-white text-sm font-semibold hover:scale-105 active:scale-95 transition-all" style={{ background: "linear-gradient(135deg, #f43f5e, #ec4899)" }}>
                      <Plus className="w-4 h-4 inline mr-1.5" />New Task
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Kanban View ── */}
            {view === "kanban" && (
              <div className="p-4 sm:p-6">
                <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
                  {STATUSES.map(s => {
                    const col = boardTasks.filter(t => t.status === s.value).sort((a, b) => a.order - b.order);
                    const isOver = dragOverStatus === s.value;
                    return (
                      <div
                        key={s.value}
                        className="shrink-0 w-72 flex flex-col rounded-2xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden transition-all"
                        style={isOver ? { borderColor: accentRing, background: accentGlow } : undefined}
                        onDragOver={e => { e.preventDefault(); setDragOverStatus(s.value); }}
                        onDragLeave={() => setDragOverStatus(null)}
                        onDrop={() => onDrop(s.value)}
                      >
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                          <span className={`text-sm font-semibold ${s.color}`}>{s.label}</span>
                          <span className="text-xs text-muted-foreground ml-1">({col.length})</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                          <AnimatePresence initial={false}>
                            {col.map(task => (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                draggable
                                onDragStart={() => setDraggedId(task.id)}
                                onDragEnd={() => { setDraggedId(null); setDragOverStatus(null); }}
                                onClick={() => setOpenTaskId(task.id)}
                                className={`p-3 rounded-xl border border-border bg-card/60 hover:bg-card/80 cursor-pointer transition-all group/card ${draggedId === task.id ? "opacity-40 scale-95" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <span className="text-sm font-medium text-foreground leading-snug">{task.title}</span>
                                  <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                                    className="opacity-0 group-hover/card:opacity-100 p-0.5 rounded hover:text-red-400 text-muted-foreground transition-all shrink-0">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {task.priority !== "none" && (
                                    <span className={`text-xs ${priorityMeta(task.priority).color}`}>{priorityMeta(task.priority).label}</span>
                                  )}
                                  {task.dueDate && (
                                    <span className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) ? "text-red-400" : "text-muted-foreground"}`}>
                                      <Calendar className="w-3 h-3" />{fmtDate(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          <button onClick={() => createTask(s.value)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-colors">
                            <Plus className="w-4 h-4" /> Add task
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Table View ── */}
            {view === "table" && (
              <div className="p-4 sm:p-6">
                <div className="rounded-2xl border border-border overflow-hidden bg-card/30 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card/60">
                          {([ ["title","Title"], ["status","Status"], ["priority","Priority"], ["dueDate","Due Date"], ["createdAt","Created"] ] as [SortCol, string][]).map(([col, label]) => (
                            <th key={col} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap" onClick={() => toggleSort(col)}>
                              <div className="flex items-center gap-1">
                                {label}
                                {sortCol === col ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                              </div>
                            </th>
                          ))}
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence initial={false}>
                          {sorted.map((task, i) => (
                            <motion.tr key={task.id}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer transition-colors group"
                              onClick={() => setOpenTaskId(task.id)}
                            >
                              <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{task.title}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta(task.status).color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta(task.status).dot}`} />
                                  {statusMeta(task.status).label}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-xs font-medium whitespace-nowrap ${priorityMeta(task.priority).color}`}>{priorityMeta(task.priority).label}</td>
                              <td className={`px-4 py-3 text-xs whitespace-nowrap ${task.dueDate && isOverdue(task.dueDate) ? "text-red-400" : "text-muted-foreground"}`}>{task.dueDate ? fmtDate(task.dueDate) : "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                              <td className="px-2 py-3">
                                <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 text-muted-foreground transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                    {sorted.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm">No tasks yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task detail panel */}
        <AnimatePresence>
          {openTask && (
            <TaskDetailPanel
              key={openTask.id}
              task={openTask}
              onUpdate={updateTask}
              onClose={() => setOpenTaskId(null)}
              accentRing={accentRing}
            />
          )}
        </AnimatePresence>
      </div>

      {/* New Board Modal */}
      <AnimatePresence>
        {showNewBoardModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
              onClick={() => setShowNewBoardModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="w-full max-w-sm bg-card/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                  <h2 className="font-bold text-lg text-foreground">New Board</h2>
                  <button onClick={() => setShowNewBoardModal(false)} className="p-2 rounded-xl border border-border bg-background/40 hover:bg-muted/60 transition-all">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Board Name</label>
                    <input
                      autoFocus
                      value={newBoardName}
                      onChange={e => setNewBoardName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newBoardName.trim()) { createBoard(newBoardName.trim(), newBoardEmoji); setShowNewBoardModal(false); }
                        if (e.key === "Escape") setShowNewBoardModal(false);
                      }}
                      placeholder="e.g. Work, Personal, Side Project…"
                      className="w-full bg-background/60 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                      style={{ boxShadow: newBoardName ? `0 0 0 2px rgba(251,113,133,0.30)` : undefined }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Icon</label>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl w-10 text-center shrink-0">{newBoardEmoji}</span>
                      <div className="grid grid-cols-5 gap-1 flex-1">
                        {EMOJIS.map(em => (
                          <button
                            key={em}
                            onClick={() => setNewBoardEmoji(em)}
                            className={`text-lg p-1.5 rounded-xl transition-colors ${newBoardEmoji === em ? "bg-muted/80 ring-1 ring-border" : "hover:bg-muted/60"}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (newBoardName.trim()) { createBoard(newBoardName.trim(), newBoardEmoji); setShowNewBoardModal(false); } }}
                    disabled={!newBoardName.trim()}
                    className="w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: "linear-gradient(135deg, #f43f5e, #ec4899)" }}
                  >
                    Create Board
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
