"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  LogOut,
  MessageSquare,
  Circle,
  Wifi,
  Loader2,
  User as UserIcon,
  Info,
  Smile,
  Zap,
  Clock,
  Volume2,
  VolumeX,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { ref, onValue, push, set, onDisconnect, serverTimestamp, update, query, orderByChild, endAt, get } from "firebase/database";
import Link from "next/link";

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  dark: {
    page:     "bg-[#0a0a0a] text-white",
    card:     "bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl",
    sidebar:  "bg-white/[0.02] border-r border-white/[0.05] backdrop-blur-2xl",
    header:   "bg-[#0a0a0a]/80 border-b border-white/[0.05] backdrop-blur-md",
    inputBg:  "bg-[#0a0a0a] border-t border-white/[0.05]",
    input:    "bg-white/[0.05] border border-white/[0.1] focus-within:border-blue-500/30 text-white placeholder:text-gray-600",
    bubble:   "bg-white/[0.05] border border-white/[0.1] text-white",
    bubbleMe: "bg-blue-600 text-white",
    accent:   "#3b82f6",
    accentGlow: "rgba(59, 130, 246, 0.15)",
    muted:    "text-gray-500",
    sub:      "text-gray-400",
    text:     "text-white",
    userCard: "bg-white/[0.03] border border-white/[0.05]",
    btnToggle: "text-gray-500 hover:text-white hover:bg-white/5",
    quickBtn: "bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/50",
    statusRing: "border-[#0a0a0a]",
  },
  light: {
    page:     "bg-slate-50 text-slate-900",
    card:     "bg-white border border-slate-200 shadow-xl",
    sidebar:  "bg-slate-100/50 border-r border-slate-200 backdrop-blur-2xl",
    header:   "bg-white/80 border-b border-slate-200 backdrop-blur-md",
    inputBg:  "bg-white border-t border-slate-200",
    input:    "bg-slate-100 border border-slate-200 focus-within:border-blue-500/30 text-slate-900 placeholder:text-slate-400",
    bubble:   "bg-white border border-slate-200 text-slate-700",
    bubbleMe: "bg-blue-600 text-white",
    accent:   "#2563eb",
    accentGlow: "rgba(37, 99, 235, 0.1)",
    muted:    "text-slate-400",
    sub:      "text-slate-500",
    text:     "text-slate-900",
    userCard: "bg-white border border-slate-100 shadow-sm",
    btnToggle: "text-slate-500 hover:text-slate-900 hover:bg-slate-200",
    quickBtn: "bg-slate-100 border border-slate-200 hover:border-blue-500/50",
    statusRing: "border-white",
  }
};

type ThemeKey = keyof typeof T;

export default function GlobalChatHub() {
  const [theme, setTheme] = useState<ThemeKey>("dark");
  const [userName, setUserName] = useState<string>("");
  const [hasJoined, setHasJoined] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const tk = T[theme];

  useEffect(() => {
    const savedTheme = localStorage.getItem("chat_theme") as ThemeKey;
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

    let id = sessionStorage.getItem("chat_user_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem("chat_user_id", id);
    }
    setUserId(id);

    const savedName = localStorage.getItem("chat_user_name");
    if (savedName) {
      setUserName(savedName);
      setHasJoined(true);
    }
  }, []);

  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showScrollTip, setShowScrollTip] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevUsersRef = useRef<string[]>([]);
  const lastMessageTimeRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const playSound = (type: 'join' | 'leave' | 'message') => {
    if (isMuted) return;
    const sounds = {
      join: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      leave: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      message: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (hasJoined && userId) {
      const connectedRef = ref(db, ".info/connected");
      onValue(connectedRef, (snap) => setIsConnected(snap.val() === true));

      const cleanupOldMessages = async () => {
        const yesterday = Date.now() - (24 * 60 * 60 * 1000);
        const msgsRef = ref(db, `projects/chat-application/messages`);
        const oldMsgsQuery = query(msgsRef, orderByChild('time'), endAt(yesterday));
        try {
          const snapshot = await get(oldMsgsQuery);
          if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => { updates[child.key!] = null; });
            await update(msgsRef, updates);
          }
        } catch {}
      };
      cleanupOldMessages();

      const userRef = ref(db, `projects/chat-application/users/${userId}`);
      set(userRef, { id: userId, name: userName, online: true, typing: false, lastSeen: serverTimestamp() });
      onDisconnect(userRef).remove();

      const usersRef = ref(db, `projects/chat-application/users`);
      let isFirstUserLoad = true;
      const unsubUsers = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const currentIds = data ? Object.keys(data) : [];
        if (!isFirstUserLoad && prevUsersRef.current.length > 0) {
          if (currentIds.length > prevUsersRef.current.length) playSound('join');
          else if (currentIds.length < prevUsersRef.current.length) playSound('leave');
        }
        prevUsersRef.current = currentIds;
        isFirstUserLoad = false;
        if (data) {
          const userList = Object.values(data).filter((u: any) => u.id !== userId);
          setUsers(userList);
        } else setUsers([]);
      });

      const msgsRef = ref(db, `projects/chat-application/messages`);
      let isFirstMsgLoad = true;
      const unsubMsgs = onValue(msgsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const msgList = Object.entries(data).map(([id, val]: any) => ({ id, ...val })).sort((a, b) => a.time - b.time);
          const latestMsg = msgList[msgList.length - 1];
          if (!isFirstMsgLoad && latestMsg && latestMsg.time > (lastMessageTimeRef.current || 0)) {
            if (latestMsg.from !== userId) {
              playSound('message');
              if (scrollContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                if (scrollHeight - scrollTop - clientHeight > 100) setShowScrollTip(true);
              }
            }
          }
          if (latestMsg) lastMessageTimeRef.current = latestMsg.time;
          isFirstMsgLoad = false;
          setMessages(msgList);
        } else {
          setMessages([]);
          isFirstMsgLoad = false;
        }
      });

      return () => { unsubUsers(); unsubMsgs(); set(userRef, null); };
    }
  }, [hasJoined, userId]);

  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (!isTyping && isConnected) {
      setIsTyping(true);
      update(ref(db, `projects/chat-application/users/${userId}`), { typing: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      update(ref(db, `projects/chat-application/users/${userId}`), { typing: false });
    }, 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent, directText?: string) => {
    e?.preventDefault();
    const textToSend = directText || newMessage;
    if (!textToSend.trim() || !isConnected) return;
    const msgsRef = ref(db, `projects/chat-application/messages`);
    push(msgsRef, { from: userId, fromName: userName, text: textToSend, time: Date.now() });
    if (!directText) setNewMessage("");
    setIsTyping(false);
    update(ref(db, `projects/chat-application/users/${userId}`), { typing: false });
    setTimeout(scrollToBottom, 100);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem("chat_user_name", userName);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0;
      audio.play().catch(() => {});
      setHasJoined(true);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("chat_theme", next);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to leave the hub?")) {
      localStorage.removeItem("chat_user_name");
      sessionStorage.removeItem("chat_user_id");
      window.location.reload();
    }
  };

  useEffect(() => { if (!showScrollTip) scrollToBottom(); }, [messages]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 50) setShowScrollTip(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollTip(false);
  };

  if (!hasJoined) {
    return (
      <div className={cn("h-full flex flex-col items-center justify-center p-6 transition-colors duration-300", tk.page)}>
        <button
          onClick={toggleTheme}
          className={cn("fixed top-8 right-8 p-3 rounded-2xl transition-all", tk.btnToggle)}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("w-full max-w-md p-10 rounded-[2.5rem] transition-colors duration-300", tk.card)}>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors" style={{ background: tk.accentGlow }}>
              <Wifi className="w-8 h-8" style={{ color: tk.accent }} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Global <span className={tk.sub}>Chat Hub</span></h1>
            <p className={cn("mt-2 text-sm", tk.sub)}>Join the real-time network and connect with others instantly.</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest opacity-40 ml-1">Your Alias</label>
              <input
                autoFocus required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="How should others see you?"
                className={cn("w-full px-6 py-4 rounded-2xl outline-none transition-all", tk.input)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Enter Hub
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex relative overflow-hidden transition-colors duration-300", tk.page)}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileSidebarOpen(false)} className="fixed inset-0 bg-black/80 z-[100] lg:hidden backdrop-blur-sm" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className={cn("fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] z-[101] lg:hidden flex flex-col shadow-2xl transition-colors duration-300", tk.sidebar)}>
              <SidebarContent users={users} userName={userName} isConnected={isConnected} isMuted={isMuted} setIsMuted={setIsMuted} handleReset={handleReset} tk={tk} theme={theme} toggleTheme={toggleTheme} />
              <button onClick={() => setIsMobileSidebarOpen(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={cn("hidden lg:flex w-80 flex-col transition-colors duration-300", tk.sidebar)}>
        <SidebarContent users={users} userName={userName} isConnected={isConnected} isMuted={isMuted} setIsMuted={setIsMuted} handleReset={handleReset} tk={tk} theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={cn("p-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300", tk.header)}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-blue-500 transition-colors"><Menu className="w-6 h-6" /></button>
            <div className="p-2 rounded-xl relative transition-colors" style={{ background: tk.accentGlow }}>
              <Wifi className="w-5 h-5" style={{ color: tk.accent }} />
              <div className={cn("absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 transition-colors", tk.statusRing, isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm tracking-tight truncate uppercase">Global Hub</h3>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Ephemeral (24h)</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={toggleTheme} className={cn("p-2 rounded-xl transition-all", tk.btnToggle)}>
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className={cn("p-2 rounded-xl transition-all", tk.btnToggle)}>{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
            <button onClick={handleReset} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative">
          <AnimatePresence>
            {showScrollTip && (
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={scrollToBottom} className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest animate-bounce hover:scale-105 transition-transform whitespace-nowrap"><ChevronDown className="w-4 h-4" /> New Messages</motion.button>
            )}
          </AnimatePresence>

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">Awaiting Transmission...</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.from === userId;
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id || idx} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                  {!isMine && <span className="text-[10px] font-black text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">{msg.fromName}</span>}
                  <div className={cn("max-w-[85%] sm:max-w-[70%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-colors duration-300", isMine ? tk.bubbleMe : tk.bubble)}>
                    <p className="leading-relaxed break-words">{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-gray-600 mt-2 font-black uppercase tracking-tighter px-1">
                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={cn("p-4 transition-colors duration-300", tk.inputBg)}>
          <div className="flex flex-wrap gap-2 mb-4">
            {["👍", "❤️", "😂", "🔥", "🙌", "🚀", "✨", "💯", "👋", "✅", "❌", "❓"].map(emoji => (
              <button key={emoji} onClick={() => handleSendMessage(undefined, emoji)} className={cn("w-10 h-10 flex items-center justify-center rounded-xl transition-all text-lg active:scale-90", tk.quickBtn)}>{emoji}</button>
            ))}
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {[
              { label: "BRB", text: "I'll be right back! 🏃" },
              { label: "Busy", text: "Currently busy... 👨‍💻" },
              { label: "Meeting", text: "In a meeting 🔇" },
              { label: "Lunch", text: "Gone for lunch! 🍕" },
            ].map(signal => (
              <button key={signal.label} onClick={() => handleSendMessage(undefined, signal.text)} className={cn("px-4 py-2 rounded-xl transition-all text-[10px] font-black text-gray-400 uppercase tracking-widest active:scale-95 whitespace-nowrap", tk.quickBtn)}>{signal.label}</button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className={cn("flex items-center gap-3 p-2 rounded-2xl transition-all", tk.input)}>
            <input
              type="text" value={newMessage} onChange={(e) => handleTyping(e.target.value)}
              placeholder={isConnected ? "Broadcast a message..." : "Syncing with Hub..."}
              disabled={!isConnected} className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2 text-inherit placeholder:text-gray-600"
            />
            <button
              type="submit" disabled={!newMessage.trim() || !isConnected}
              className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isConnected ? <Send className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ users, userName, isConnected, isMuted, setIsMuted, handleReset, tk, theme, toggleTheme }: any) {
  return (
    <>
      <div className="p-8 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-6">
          <Link href="/projects/creative-stuff" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-primary transition-colors group">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
          <button onClick={toggleTheme} className={cn("p-2 rounded-xl lg:hidden", tk.btnToggle)}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase">Active <span className="text-gray-500">Hub</span></h2>
        </div>
        <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.25em]">Connections ({users.length + 1})</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {users.map((user: any) => (
          <div key={user.id} className={cn("flex items-center gap-4 p-4 rounded-3xl backdrop-blur-md transition-all", tk.userCard)}>
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500 font-black uppercase">{user.name[0]}</div>
              {user.typing && (
                <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1 shadow-xl">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-white rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-inherit truncate uppercase tracking-tight">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{user.typing ? "Typing..." : "Online"}</span>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-20 text-center px-6">
            <UserIcon className="w-8 h-8 mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest">No peers detected</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.05] flex items-center justify-center text-gray-500 font-black uppercase">{userName[0]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-inherit truncate uppercase tracking-tight">{userName}</p>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Your Profile</span>
          </div>
          <button onClick={handleReset} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
