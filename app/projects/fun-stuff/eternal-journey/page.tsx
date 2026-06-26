"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import {
  Heart,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Music,
  MapPin,
  Calendar,
  Gift,
  Volume2,
  VolumeX,
  Camera,
  Star,
  Shield,
  Wand2,
  Sun,
  Feather,
  Anchor,
} from "lucide-react";
import Link from "next/link";
import { STORY_CONFIG } from "./lib/config";

// --- Components ---

const FloatingHearts = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            y: "110vh",
            x: `${Math.random() * 100}vw`,
            scale: Math.random() * 0.5 + 0.3,
            rotate: Math.random() * 360
          }}
          animate={{
            opacity: [0, 0.4, 0],
            y: "-20vh",
            rotate: Math.random() * 720
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            delay: Math.random() * 20,
            ease: "linear"
          }}
          className="absolute text-rose-500/30"
        >
          <Heart fill="currentColor" size={Math.random() * 30 + 15} />
        </motion.div>
      ))}
    </div>
  );
};

const SectionWrapper = ({ children, id, className = "" }: { children: React.ReactNode, id: string, className?: string }) => (
  <section id={id} className={`min-h-screen relative flex flex-col items-center justify-center px-6 py-32 ${className}`}>
    {children}
  </section>
);

const TypewriterText = ({ text, delay = 0 }: { text: string, delay?: number }) => {
  const words = text.split(" ");
  return (
    <motion.div className="inline-block">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.05 }}
          className="inline-block mr-1.5"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

// --- Main Page ---

export default function EternalJourneyPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [noButtonStyle, setNoButtonStyle] = useState({});
  const [proposalStatus, setProposalStatus] = useState<"pending" | "yes">("pending");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isMusicPlaying]);

  const handleNoButtonHover = () => {
    const x = Math.random() * 300 - 150;
    const y = Math.random() * 300 - 150;
    setNoButtonStyle({
      transform: `translate(${x}px, ${y}px)`,
      transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
    });
  };

  if (!mounted) return null;

  return (
    <main ref={containerRef} className="bg-[#050505] text-white selection:bg-rose-500/40 overflow-x-hidden antialiased">
      <audio ref={audioRef} src="/assets/music/music.mp3" loop preload="none" />
      <FloatingHearts />

      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation & Controls */}
      <div className="fixed top-8 left-8 right-8 z-50 flex justify-between items-center">
        <Link href="/projects/fun-stuff" className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl transition-all group flex items-center gap-2">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">Back</span>
        </Link>

        <button
          onClick={() => setIsMusicPlaying(!isMusicPlaying)}
          className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl transition-all flex items-center gap-2"
        >
          {isMusicPlaying ? <Volume2 className="w-5 h-5 text-rose-500" /> : <VolumeX className="w-5 h-5 text-white/40" />}
          <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">
            {isMusicPlaying ? "Music On" : "Music Off"}
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <SectionWrapper id="splash" key="splash" className="z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="text-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-12 flex justify-center"
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-rose-500 blur-3xl opacity-20 rounded-full"
                  />
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="relative p-8 bg-gradient-to-br from-rose-500/20 to-purple-600/20 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl"
                  >
                    <Heart className="w-16 h-16 text-rose-500" fill="currentColor" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-6xl md:text-9xl font-extrabold tracking-tighter mb-6 leading-[0.9] bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent"
              >
                {STORY_CONFIG.hero.title}
              </motion.h1>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.65 }}
                className="flex items-center justify-center gap-3 mb-8"
              >
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-rose-500/50" />
                <p className="text-rose-400 font-serif italic text-xl md:text-2xl tracking-widest">
                  Vikas <span className="text-rose-500 mx-1">♥</span> Shweta
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-rose-500/50" />
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-16 leading-relaxed px-6"
              >
                {STORY_CONFIG.hero.subtitle}
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={() => setHasStarted(true)}
                className="group relative px-12 py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-3xl font-black text-lg transition-all shadow-2xl shadow-rose-600/30 active:scale-95 flex items-center gap-4 mx-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10">{STORY_CONFIG.hero.buttonText}</span>
                <Sparkles className="relative z-10 w-6 h-6 animate-pulse" />
              </motion.button>
            </motion.div>
          </SectionWrapper>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="w-full relative z-10"
          >
            {/* 1. The Timeline */}
            <SectionWrapper id="timeline" className="justify-start">
              <div className="max-w-5xl w-full mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-32 text-center"
                >
                  <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.3em] uppercase border rounded-full border-rose-500/20 bg-rose-500/5 text-rose-500">
                    The Story of Us
                  </span>
                  <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Our Timeline</h2>
                  <p className="text-xl text-white/40 max-w-lg mx-auto leading-relaxed">Every step we've taken together has led us to this very moment.</p>
                </motion.div>

                <div className="relative ml-4 md:ml-0 md:flex md:flex-col md:items-center">
                  {/* Timeline Center Line */}
                  <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-rose-500/0 via-rose-500 to-rose-500/0 hidden md:block" />
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-rose-500/20 md:hidden" />

                  <div className="space-y-24 w-full">
                    {STORY_CONFIG.timeline.map((item, i) => (
                      <div key={i} className={`relative flex items-center w-full ${i % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                        {/* Timeline Dot */}
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          className="absolute left-[-9px] md:left-1/2 md:ml-[-9px] top-0 w-5 h-5 bg-[#050505] border-2 border-rose-500 rounded-full z-20 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                        />

                        <motion.div
                          initial={{ opacity: 0, x: i % 2 === 0 ? 100 : -100 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: "-100px" }}
                          transition={{ type: "spring", damping: 20, stiffness: 100 }}
                          className={`w-full md:w-1/2 ${i % 2 === 0 ? "md:pl-20" : "md:pr-20"} pl-10`}
                        >
                          <div className="group p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-2xl hover:bg-white/[0.08] hover:border-rose-500/30 transition-all duration-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                              <item.icon size={80} />
                            </div>

                            <div className={`flex items-center gap-4 mb-6 ${i % 2 === 0 ? "" : "md:flex-row-reverse"}`}>
                              <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform duration-500">
                                <item.icon size={24} />
                              </div>
                              <span className="text-sm font-black font-mono text-rose-500/60 uppercase tracking-[0.2em]">{item.date}</span>
                            </div>

                            <h3 className="text-3xl font-black mb-4 tracking-tight group-hover:text-rose-500 transition-colors">{item.title}</h3>
                            <p className="text-lg text-white/60 leading-relaxed mb-6">{item.description}</p>

                            {item.location && (
                              <div className={`flex items-center gap-2 text-xs font-bold text-white/30 uppercase tracking-widest ${i % 2 === 0 ? "" : "md:flex-row-reverse"}`}>
                                <MapPin size={14} className="text-rose-500/50" />
                                {item.location}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionWrapper>

            {/* 2. Photo Moments Gallery */}
            <SectionWrapper id="gallery" className="bg-gradient-to-b from-transparent via-rose-950/5 to-transparent">
              <div className="max-w-6xl w-full mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-20 text-center"
                >
                  <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.3em] uppercase border rounded-full border-rose-500/20 bg-rose-500/5 text-rose-500">
                    Visual Memories
                  </span>
                  <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Captured Moments</h2>
                  <p className="text-xl text-white/40 max-w-lg mx-auto">The little glimpses of our beautiful life together.</p>
                </motion.div>

                <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6 md:[grid-template-rows:280px_280px]">
                  {[
                    { rot: -3,   span: "aspect-[3/4] md:aspect-auto col-span-1 md:col-span-2 md:row-span-2" },
                    { rot: 2,    span: "aspect-[3/4] md:aspect-auto col-span-1 md:col-span-1 md:row-span-1" },
                    { rot: -1.5, span: "aspect-[3/4] md:aspect-auto col-span-1 md:col-span-1 md:row-span-2" },
                    { rot: 1.5,  span: "aspect-[3/4] md:aspect-auto col-span-1 md:col-span-1 md:row-span-1" },
                  ].map((cfg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0, rotate: cfg.rot }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12, duration: 0.7, ease: "easeOut" }}
                      whileHover={{ rotate: 0, y: -10, scale: 1.04, zIndex: 30 }}
                      className={`${cfg.span} relative group`}
                    >
                      <div className="absolute inset-0 flex flex-col bg-white p-2 md:p-3 shadow-[0_8px_35px_rgba(0,0,0,0.45)] group-hover:shadow-[0_20px_70px_rgba(0,0,0,0.7)] transition-shadow duration-500">
                        <div className="relative flex-1 overflow-hidden">
                          <img
                            src={STORY_CONFIG.gallery![i].url}
                            alt={STORY_CONFIG.gallery![i].caption}
                            className="absolute inset-0 w-full h-full object-cover sepia-[0.15] group-hover:sepia-0 group-hover:scale-105 transition-all duration-700"
                          />
                          <div className="absolute inset-0 bg-rose-950/10 group-hover:bg-transparent transition-colors duration-700" />
                        </div>
                        <div className="flex-none h-9 md:h-11 flex items-center justify-center px-2">
                          <p className="text-gray-500 text-[9px] md:text-[11px] italic text-center font-medium leading-tight">
                            {STORY_CONFIG.gallery![i].caption}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SectionWrapper>

            {/* 3. Together — Animated Scene */}
            <SectionWrapper id="together" className="bg-[#020208] overflow-hidden">
              <div className="w-full max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-16 text-center"
                >
                  <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.3em] uppercase border rounded-full border-rose-500/20 bg-rose-500/5 text-rose-500">
                    Our Universe
                  </span>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">Where Two Worlds Became One</h2>
                  <p className="text-white/40 text-lg max-w-md mx-auto">Under the same stars, our story began.</p>
                </motion.div>

                {/* Animated scene */}
                <div className="relative w-full h-[420px] md:h-[520px]">
                  <svg viewBox="0 0 900 460" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    {/* Stars */}
                    {[
                      [60,30],[140,55],[220,20],[300,45],[400,15],[500,40],[600,25],[700,50],[800,20],[850,70],
                      [80,100],[180,80],[350,90],[470,70],[620,95],[750,75],[900,50],[30,140],[250,130],[550,120],
                    ].map(([cx, cy], i) => (
                      <motion.circle
                        key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 2 : 1.2}
                        fill="white"
                        initial={{ opacity: 0.2 }}
                        animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.4, 1] }}
                        transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                      />
                    ))}

                    {/* Moon */}
                    <motion.circle cx={810} cy={70} r={48} fill="#fef3c7" opacity={0.12}
                      animate={{ opacity: [0.10, 0.18, 0.10] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <circle cx={810} cy={70} r={38} fill="#fef9e7" opacity={0.18} />
                    <circle cx={810} cy={70} r={28} fill="#fffbeb" opacity={0.25} />

                    {/* Hill */}
                    <ellipse cx={450} cy={500} rx={520} ry={140} fill="#0f0520" />
                    <ellipse cx={450} cy={490} rx={460} ry={110} fill="#120824" />

                    {/* Ground line glow */}
                    <ellipse cx={450} cy={368} rx={300} ry={12} fill="rgba(244,63,94,0.06)" />

                    {/* === Woman silhouette (left) === */}
                    <motion.g
                      initial={{ x: -120, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                    >
                      {/* Head */}
                      <circle cx={348} cy={240} r={22} fill="white" opacity={0.92} />
                      {/* Hair */}
                      <ellipse cx={348} cy={228} rx={24} ry={14} fill="white" opacity={0.75} />
                      {/* Body */}
                      <path d="M330 262 Q320 310 316 360 L380 360 Q376 310 366 262 Z" fill="white" opacity={0.9} />
                      {/* Dress flare */}
                      <path d="M316 330 Q290 370 280 390 L390 390 Q395 370 380 330 Z" fill="white" opacity={0.75} />
                      {/* Arm toward partner */}
                      <path d="M366 290 Q395 300 415 310" stroke="white" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.88} />
                    </motion.g>

                    {/* === Man silhouette (right) === */}
                    <motion.g
                      initial={{ x: 120, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                    >
                      {/* Head */}
                      <circle cx={552} cy={230} r={24} fill="white" opacity={0.92} />
                      {/* Body */}
                      <path d="M532 254 Q522 305 518 365 L586 365 Q582 305 572 254 Z" fill="white" opacity={0.9} />
                      {/* Legs */}
                      <path d="M524 340 Q520 375 518 395" stroke="white" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.85} />
                      <path d="M578 340 Q582 375 584 395" stroke="white" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.85} />
                      {/* Arm toward partner */}
                      <path d="M532 285 Q505 295 485 310" stroke="white" strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.88} />
                    </motion.g>

                    {/* Joined hands glow */}
                    <motion.circle cx={450} cy={312} r={14}
                      fill="rgba(244,63,94,0.25)"
                      animate={{ r: [12, 18, 12], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Floating hearts between them */}
                    {[
                      { cx: 435, delay: 0,   size: 10 },
                      { cx: 455, delay: 0.6, size: 7  },
                      { cx: 470, delay: 1.2, size: 9  },
                      { cx: 420, delay: 1.8, size: 6  },
                      { cx: 462, delay: 2.4, size: 8  },
                    ].map((h, i) => (
                      <motion.path
                        key={i}
                        d={`M${h.cx},295 C${h.cx-h.size},${285} ${h.cx-h.size*2},${278} ${h.cx},${272} C${h.cx+h.size*2},${278} ${h.cx+h.size},${285} ${h.cx},${295} Z`}
                        fill="rgba(244,63,94,0.85)"
                        initial={{ y: 0, opacity: 0 }}
                        animate={{ y: [-0, -55, -80], opacity: [0, 0.9, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, delay: h.delay, ease: "easeOut" }}
                      />
                    ))}

                    {/* Names */}
                    <motion.text x={310} y={408} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="13" fontStyle="italic" fontFamily="serif"
                      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }}
                    >Shweta</motion.text>
                    <motion.text x={592} y={408} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="13" fontStyle="italic" fontFamily="serif"
                      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }}
                    >Vikas</motion.text>
                  </svg>
                </div>
              </div>
            </SectionWrapper>

            {/* 4. The Love Letter */}
            <SectionWrapper id="letter" className="bg-[#050505]">
              <div className="max-w-2xl w-full mx-auto relative">
                <div className="absolute -inset-24 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                  initial={{ opacity: 0, y: 40, rotate: -1 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative rounded-[2.5rem] overflow-hidden bg-[#0f0608] border border-rose-500/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
                >
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />

                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.022]"
                    style={{
                      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(255,100,100,0.8) 31px, rgba(255,100,100,0.8) 32px)",
                      backgroundPositionY: "72px",
                    }}
                  />

                  <div className="p-10 md:p-16 relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-rose-500/30" />
                      <div className="flex items-center gap-1">
                        <Heart size={10} fill="currentColor" className="text-rose-500/50" />
                        <Heart size={16} fill="currentColor" className="text-rose-500" />
                        <Heart size={10} fill="currentColor" className="text-rose-500/50" />
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-rose-500/30" />
                    </div>

                    <motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl md:text-4xl font-serif italic text-rose-400 mb-8"
                    >
                      {STORY_CONFIG.letter.title}
                    </motion.h3>

                    <div className="space-y-5 mb-12">
                      {STORY_CONFIG.letter.paragraphs.map((para, i) => (
                        <motion.p
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.15 }}
                          className="text-lg leading-[1.95] text-white/65 italic font-light"
                        >
                          {para}
                        </motion.p>
                      ))}
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.9 }}
                      className="flex flex-col items-end gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-px bg-rose-500/30" />
                        <Heart size={10} fill="currentColor" className="text-rose-500/40" />
                      </div>
                      <p className="text-2xl font-serif italic text-rose-400">{STORY_CONFIG.letter.signature}</p>
                    </motion.div>
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
                </motion.div>

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.1, type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute -bottom-6 left-10 w-14 h-14 rounded-full bg-rose-950 border-2 border-rose-700/50 shadow-[0_0_25px_rgba(225,29,72,0.25)] flex items-center justify-center z-20"
                >
                  <Heart size={18} fill="currentColor" className="text-rose-400" />
                </motion.div>
              </div>
            </SectionWrapper>

            {/* 4. Reasons Why */}
            <SectionWrapper id="reasons" className="bg-gradient-to-b from-transparent to-rose-950/5">
              <div className="max-w-5xl w-full mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-20 text-center"
                >
                  <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.3em] uppercase border rounded-full border-rose-500/20 bg-rose-500/5 text-rose-500">
                    My Endless List
                  </span>
                  <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter">Reasons I Love You</h2>
                  <p className="text-xl text-white/40 max-w-lg mx-auto leading-relaxed">Every word here is a piece of my heart, Shweta.</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    const cardStyles = [
                      { grad: "from-rose-950/60 to-[#0d0208]",     border: "border-rose-500/15",   accent: "text-rose-400",   iconBg: "bg-rose-500/10 border-rose-500/20",   Icon: Sparkles },
                      { grad: "from-purple-950/60 to-[#060212]",   border: "border-purple-500/15", accent: "text-purple-400", iconBg: "bg-purple-500/10 border-purple-500/20", Icon: Star    },
                      { grad: "from-pink-950/60 to-[#0d0210]",     border: "border-pink-500/15",   accent: "text-pink-400",   iconBg: "bg-pink-500/10 border-pink-500/20",   Icon: Shield  },
                      { grad: "from-red-950/60 to-[#0d0202]",      border: "border-red-500/15",    accent: "text-red-400",    iconBg: "bg-red-500/10 border-red-500/20",     Icon: Wand2   },
                      { grad: "from-rose-950/60 to-purple-950/40", border: "border-rose-400/15",   accent: "text-rose-300",   iconBg: "bg-rose-500/10 border-rose-400/20",   Icon: Heart   },
                      { grad: "from-fuchsia-950/60 to-[#08020d]",  border: "border-fuchsia-500/15",accent: "text-fuchsia-400",iconBg: "bg-fuchsia-500/10 border-fuchsia-500/20", Icon: Sun },
                      { grad: "from-pink-950/60 to-rose-950/40",   border: "border-pink-400/15",   accent: "text-pink-300",   iconBg: "bg-pink-500/10 border-pink-400/20",   Icon: Feather },
                      { grad: "from-purple-950/60 to-pink-950/40", border: "border-purple-400/15", accent: "text-purple-300", iconBg: "bg-purple-500/10 border-purple-400/20",Icon: Anchor  },
                    ];
                    return STORY_CONFIG.reasons.map((reason, i) => {
                      const s = cardStyles[i];
                      return (
                        <motion.div
                          key={reason.id}
                          initial={{ opacity: 0, y: 60 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-60px" }}
                          transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
                          whileHover={{ y: -8, scale: 1.015 }}
                          className={`group relative min-h-[280px] flex flex-col rounded-3xl bg-gradient-to-br ${s.grad} border ${s.border} overflow-hidden backdrop-blur-sm p-8 md:p-10 cursor-default`}
                        >
                          {/* Subtle corner glow */}
                          <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors duration-700" />

                          {/* Top row: number + icon */}
                          <div className="flex items-start justify-between mb-6 relative z-10">
                            <span className={`text-[10px] font-black font-mono tracking-[0.3em] ${s.accent} opacity-50 uppercase`}>
                              #{String(reason.id).padStart(2, "0")}
                            </span>
                            <div className={`w-9 h-9 rounded-xl border ${s.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                              <s.Icon size={16} className={s.accent} />
                            </div>
                          </div>

                          {/* Opening quote mark — the visual centrepiece */}
                          <p className={`font-serif text-7xl leading-none ${s.accent} opacity-30 mb-3 group-hover:opacity-60 transition-opacity duration-600 relative z-10 select-none`}>
                            ❝
                          </p>

                          {/* Title in romantic serif italic */}
                          <h3 className="font-serif italic text-2xl md:text-[1.65rem] font-semibold text-white/90 mb-4 leading-snug relative z-10 group-hover:text-white transition-colors duration-400">
                            {reason.title}
                          </h3>

                          {/* Hairline divider with heart */}
                          <div className="flex items-center gap-3 mb-5 relative z-10">
                            <div className={`h-px flex-1 bg-gradient-to-r from-transparent to-rose-500/25`} />
                            <Heart size={8} fill="currentColor" className="text-rose-500/35 group-hover:text-rose-500/60 transition-colors duration-500" />
                            <div className={`h-px flex-1 bg-gradient-to-l from-transparent to-rose-500/25`} />
                          </div>

                          {/* Reason prose */}
                          <p className="text-white/55 text-[14px] md:text-[15px] leading-[1.9] italic group-hover:text-white/80 transition-colors duration-400 relative z-10 flex-1">
                            {reason.text}
                          </p>
                        </motion.div>
                      );
                    });
                  })()}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center mt-10"
                >
                  <div className="flex flex-col items-center gap-4 px-12 py-8 rounded-3xl border border-rose-500/10 bg-rose-500/[0.03]">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
                      <Heart size={30} fill="currentColor" className="text-rose-500/50 mx-auto" />
                    </motion.div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-white/25">And millions more, Shweta...</p>
                  </div>
                </motion.div>
              </div>
            </SectionWrapper>

            {/* 5. The Big Question */}
            <SectionWrapper id="proposal" className="min-h-[120vh]">
              <div className="text-center relative z-20">
                {proposalStatus === "pending" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="space-y-16"
                  >
                    <div className="relative inline-block">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-40px] border border-dashed border-rose-500/20 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="relative p-10 bg-rose-500/10 rounded-full border border-rose-500/20 backdrop-blur-3xl"
                      >
                        <Gift className="w-12 h-12 text-rose-500" />
                      </motion.div>
                    </div>

                    <h2 className="text-6xl md:text-9xl font-black tracking-tighter max-w-4xl mx-auto leading-[0.9] bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
                      {STORY_CONFIG.proposal.question}
                    </h2>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-10 pt-10">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setProposalStatus("yes")}
                        className="px-16 py-8 bg-rose-600 hover:bg-rose-700 text-white rounded-[2.5rem] font-black text-2xl transition-all shadow-[0_20px_60px_-15px_rgba(225,29,72,0.5)] flex items-center gap-4"
                      >
                        {STORY_CONFIG.proposal.yesText}
                        <Heart className="w-6 h-6 fill-current" />
                      </motion.button>

                      <button
                        onMouseEnter={handleNoButtonHover}
                        style={noButtonStyle}
                        className="px-12 py-6 bg-white/5 hover:bg-white/10 text-white/40 rounded-[2.5rem] font-bold text-xl border border-white/5 transition-all"
                      >
                        {STORY_CONFIG.proposal.noText}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-12"
                  >
                    <motion.div
                       animate={{
                         scale: [1, 1.2, 1],
                         y: [0, -20, 0]
                       }}
                       transition={{ duration: 3, repeat: Infinity }}
                       className="text-[150px] leading-none"
                    >
                      🎊
                    </motion.div>

                    <h2 className="text-8xl md:text-[12rem] font-black tracking-tighter text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                      YES!
                    </h2>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-2xl md:text-4xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed italic"
                    >
                      "Here's to the rest of our lives together. I love you more than words could ever possibly express."
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="pt-20 flex flex-col items-center gap-8"
                    >
                      <Heart className="w-12 h-12 text-rose-500 animate-bounce" fill="currentColor" />
                       <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-white/40 hover:text-rose-500 font-black uppercase tracking-[0.4em] text-sm flex items-center gap-4 transition-all group">
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-2 transition-transform" /> Revisit Our Memories
                       </button>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </SectionWrapper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Progress Bar */}
      {hasStarted && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 h-2 bg-rose-500 origin-left z-50 shadow-[0_0_20px_rgba(244,63,94,0.8)]"
          style={{ scaleX: smoothProgress }}
        />
      )}
    </main>
  );
}
