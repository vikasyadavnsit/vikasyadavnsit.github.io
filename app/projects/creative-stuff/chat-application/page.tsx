"use client";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Search,
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
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { ref, onValue, push, set, onDisconnect, serverTimestamp, update, query, orderByChild, endAt, get, remove } from "firebase/database";

export default function FirebaseOpenChat() {
  const [userName, setUserName] = useState<string>("");
  const [hasJoined, setHasJoined] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // 1. Identity
    let id = sessionStorage.getItem("chat_user_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem("chat_user_id", id);
    }
    setUserId(id);

    // 2. Persistence - Auto-join if name exists
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

  // Play Sound Utility
  const playSound = (type: 'join' | 'leave' | 'message') => {
    if (isMuted) return;
    const sounds = {
      join: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      leave: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      message: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Audio play blocked - needs user interaction"));
  };

  useEffect(() => {
    if (hasJoined && userId) {
      // 0. Monitor Connection
      const connectedRef = ref(db, ".info/connected");
      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      });

      // 1. Cleanup old messages (older than 24h)
      const cleanupOldMessages = async () => {
        const yesterday = Date.now() - (24 * 60 * 60 * 1000);
        const msgsRef = ref(db, `projects/chat-application/messages`);
        const oldMsgsQuery = query(msgsRef, orderByChild('time'), endAt(yesterday));

        try {
          const snapshot = await get(oldMsgsQuery);
          if (snapshot.exists()) {
            const updates: any = {};
            snapshot.forEach((child) => {
              updates[child.key!] = null;
            });
            await update(msgsRef, updates);
          }
        } catch (e) {
          console.error("Cleanup failed", e);
        }
      };
      cleanupOldMessages();

      // 2. Join Discovery
      const userRef = ref(db, `projects/chat-application/users/${userId}`);
      set(userRef, {
        id: userId,
        name: userName,
        online: true,
        typing: false,
        lastSeen: serverTimestamp()
      });

      // 3. Handle Disconnect
      onDisconnect(userRef).remove();

      // 4. Listen for Users
      const usersRef = ref(db, `projects/chat-application/users`);
      let isFirstUserLoad = true;
      const unsubUsers = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const currentIds = data ? Object.keys(data) : [];

        // Only play sounds if NOT the first load and count changed
        if (!isFirstUserLoad && prevUsersRef.current.length > 0) {
          if (currentIds.length > prevUsersRef.current.length) playSound('join');
          else if (currentIds.length < prevUsersRef.current.length) playSound('leave');
        }

        prevUsersRef.current = currentIds;
        isFirstUserLoad = false;

        if (data) {
          const userList = Object.values(data).filter((u: any) => u.id !== userId);
          setUsers(userList);
        } else {
          setUsers([]);
        }
      });

      // 5. Listen for Messages
      const msgsRef = ref(db, `projects/chat-application/messages`);
      let isFirstMsgLoad = true;
      const unsubMsgs = onValue(msgsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const msgList = Object.entries(data).map(([id, val]: any) => ({
            id,
            ...val
          })).sort((a, b) => a.time - b.time);

          // Play sound for NEW incoming messages not from me
          const latestMsg = msgList[msgList.length - 1];
          if (!isFirstMsgLoad && latestMsg && latestMsg.time > (lastMessageTimeRef.current || 0)) {
            if (latestMsg.from !== userId) {
              playSound('message');
              // Show scroll tip if user is not at bottom
              if (scrollContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                if (scrollHeight - scrollTop - clientHeight > 100) {
                  setShowScrollTip(true);
                }
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

      return () => {
        unsubUsers();
        unsubMsgs();
        set(userRef, null);
      };
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
    push(msgsRef, {
      from: userId,
      fromName: userName,
      text: textToSend,
      time: Date.now()
    });

    if (!directText) setNewMessage("");
    // Stop typing status
    setIsTyping(false);
    update(ref(db, `projects/chat-application/users/${userId}`), { typing: false });

    // Autoscroll for the sender
    setTimeout(scrollToBottom, 100);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem("chat_user_name", userName);
      // Trigger a silent sound to "unlock" audio in browser
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0;
      audio.play().catch(e => console.log("Audio unlock attempted"));
      setHasJoined(true);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to logout? This will clear your display name.")) {
      localStorage.removeItem("chat_user_name");
      sessionStorage.removeItem("chat_user_id");
      window.location.reload();
    }
  };

  useEffect(() => {
    // Only autoscroll if user is already at bottom or just sent a message
    if (!showScrollTip) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setShowScrollTip(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollTip(false);
  };

  if (!hasJoined) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-indigo-100 p-10"
        >
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Wifi className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Open Chat</h1>
            <p className="text-gray-500 mt-2">Join the global network and chat with everyone currently online.</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
              <input
                autoFocus
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
            >
              Start Chatting
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] lg:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-white z-[101] lg:hidden flex flex-col shadow-2xl"
            >
              <SidebarContent
                users={users}
                userName={userName}
                isConnected={isConnected}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
                handleReset={handleReset}
              />
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-80 border-r border-gray-100 flex-col bg-slate-50/50">
        <SidebarContent
          users={users}
          userName={userName}
          isConnected={isConnected}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          handleReset={handleReset}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-primary transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="p-2 bg-primary/5 rounded-lg relative">
              <Wifi className="w-5 h-5 text-primary" />
              <div className={cn("absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 leading-none truncate">Global Chat</h3>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Expires 24h</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={handleReset} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30 relative"
        >
          <AnimatePresence>
            {showScrollTip && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={scrollToBottom}
                className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full shadow-2xl font-bold text-xs animate-bounce hover:scale-105 transition-transform whitespace-nowrap"
              >
                <ChevronDown className="w-4 h-4" />
                New messages below
              </motion.button>
            )}
          </AnimatePresence>

          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-sm text-center">
              <Info className="w-3 h-3 flex-shrink-0" />
              Auto-deleted after 24 hours
            </div>
          </div>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm font-medium px-4">Welcome! Start a conversation.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.from === userId;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id || idx}
                  className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
                >
                  {!isMine && <span className="text-[10px] font-bold text-gray-400 mb-1 ml-1">{msg.fromName}</span>}
                  <div className={cn(
                    "max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-sm shadow-sm",
                    isMine ? "bg-primary text-white rounded-tr-none" : "bg-white text-gray-700 rounded-tl-none border border-gray-100"
                  )}>
                    <p className="break-words">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 font-medium px-1">
                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-100">
          {/* Emojis - Responsive wrap */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-100 rounded-xl mr-1 flex-shrink-0">
               <Smile className="w-3.5 h-3.5 text-primary" />
               <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Express</span>
            </div>
            {["👍", "❤️", "😂", "🔥", "🙌", "🚀", "✨", "💯", "👋", "✅", "❌", "❓"].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleSendMessage(undefined, emoji)}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-gray-100 rounded-lg sm:rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all text-base sm:text-lg active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Quick Signals - Scrollable on mobile if too many */}
          <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
             <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-100 rounded-xl mr-1 flex-shrink-0">
               <Zap className="w-3.5 h-3.5 text-amber-500" />
               <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase">Quick</span>
            </div>
            {[
              { label: "BRB", text: "I'll be right back! 🏃" },
              { label: "Busy", text: "Currently busy... 👨‍💻" },
              { label: "Meeting", text: "In a meeting 🔇" },
              { label: "Lunch", text: "Gone for lunch! 🍕" },
            ].map(signal => (
              <button
                key={signal.label}
                onClick={() => handleSendMessage(undefined, signal.text)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-100 rounded-lg sm:rounded-xl hover:border-primary/30 hover:shadow-sm transition-all text-[10px] sm:text-[11px] font-bold text-gray-600 active:scale-95 whitespace-nowrap flex-shrink-0"
              >
                {signal.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3 bg-gray-50 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-gray-100">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder={isConnected ? "Say something..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1 bg-transparent border-none outline-none text-sm px-2 sm:px-4 py-1.5 sm:py-2 text-slate-900 min-w-0"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="p-2 sm:p-3 bg-primary text-white rounded-lg sm:rounded-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
            >
              {isConnected ? <Send className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper component for Sidebar Content to avoid duplication
function SidebarContent({ users, userName, isConnected, isMuted, setIsMuted, handleReset }: any) {
  return (
    <>
      <div className="p-6 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Online Now</h2>
          <div className="flex gap-1">
            <button onClick={handleReset} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Public Network ({users.length + 1})</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {users.map((user: any) => (
          <div
            key={user.id}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-gray-100"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                {user.name[0].toUpperCase()}
              </div>
              {user.typing && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                  <span className="flex gap-0.5 px-1 py-0.5">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                <span className="text-[10px] text-gray-400 font-bold">{user.typing ? "Typing..." : "Online"}</span>
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-40 text-center px-4">
            <UserIcon className="w-8 h-8 mb-2" />
            <p className="text-xs font-medium">No other users online.</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
            {userName[0]}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-900">{userName} (You)</p>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Network Hub</span>
          </div>
        </div>
      </div>
    </>
  );
}
