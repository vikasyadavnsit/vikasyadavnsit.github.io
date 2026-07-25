"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, ArrowRight, AlertCircle, X } from "lucide-react";
import Link from "next/link";

// ─── Character config ─────────────────────────────────────────────────────────
const characters = [
  {
    id: "tomcat",
    name: "Tomcat",
    emoji: "🐱",
    label: "Kitty-ish",
    playbackRate: 1.4,
    filter: { type: "highshelf" as BiquadFilterType, frequency: 3000, gain: 8 },
    gradient: "from-orange-400 to-rose-500",
    glow: "shadow-orange-500/40",
    accentColor: "#f97316",
    barColor: "#fb923c",
  },
  {
    id: "dog",
    name: "Dog",
    emoji: "🐶",
    label: "Gruff",
    playbackRate: 0.62,
    filter: { type: "lowshelf" as BiquadFilterType, frequency: 400, gain: 10 },
    gradient: "from-yellow-400 to-amber-500",
    glow: "shadow-yellow-500/40",
    accentColor: "#f59e0b",
    barColor: "#fbbf24",
  },
  {
    id: "parrot",
    name: "Parrot",
    emoji: "🦜",
    label: "Squawky",
    playbackRate: 1.9,
    filter: { type: "peaking" as BiquadFilterType, frequency: 5000, gain: 12 },
    gradient: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-500/40",
    accentColor: "#10b981",
    barColor: "#34d399",
  },
  {
    id: "robot",
    name: "Robot",
    emoji: "🤖",
    label: "Monotone",
    playbackRate: 0.78,
    filter: { type: "bandpass" as BiquadFilterType, frequency: 1000, gain: 0 },
    distortion: true,
    gradient: "from-sky-400 to-blue-600",
    glow: "shadow-sky-500/40",
    accentColor: "#0ea5e9",
    barColor: "#38bdf8",
  },
  {
    id: "ghost",
    name: "Ghost",
    emoji: "👻",
    label: "Spooky",
    playbackRate: 0.45,
    reverb: true,
    gradient: "from-violet-400 to-purple-600",
    glow: "shadow-violet-500/40",
    accentColor: "#8b5cf6",
    barColor: "#a78bfa",
  },
] as const;

type CharacterId = typeof characters[number]["id"];
type Phase = "idle" | "listening" | "speech" | "processing" | "playing" | "error";

// ─── Audio helpers ─────────────────────────────────────────────────────────────
function createReverb(ctx: AudioContext): ConvolverNode {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function createDistortion(ctx: AudioContext, amount = 80): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";
  return shaper;
}

function getRMS(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

// ─── SVG character props ──────────────────────────────────────────────────────
interface CharSVGProps {
  mouthOpen: number;
  eyesBlink: boolean;
  active: boolean;
  bassLevel: number;
}

// ─── Tomcat ───────────────────────────────────────────────────────────────────
function TomcatSVG({ mouthOpen, eyesBlink, active, bassLevel }: CharSVGProps) {
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="w-full h-full"
      animate={{ y: active ? -(bassLevel * 12) : [0, -6, 0] }}
      transition={
        active
          ? { type: "spring", stiffness: 420, damping: 16 }
          : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <defs>
        <linearGradient id="tc-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <radialGradient id="tc-sh" cx="32%" cy="28%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Tail */}
      <motion.path
        d="M 148 190 Q 174 162 168 132 Q 163 112 150 118"
        fill="none" stroke="#f97316" strokeWidth="13" strokeLinecap="round"
        animate={{ rotate: active ? [-8, 8, -8] : [-4, 4, -4] }}
        style={{ transformBox: "fill-box", transformOrigin: "148px 190px" }}
        transition={{ duration: active ? 0.5 : 2.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Body */}
      <ellipse cx="100" cy="195" rx="53" ry="46" fill="url(#tc-b)" />
      <ellipse cx="100" cy="195" rx="53" ry="46" fill="url(#tc-sh)" />
      <ellipse cx="100" cy="192" rx="29" ry="33" fill="#fff7ed" opacity="0.88" />

      {/* Arms */}
      <ellipse cx="53" cy="200" rx="14" ry="28" fill="#f97316" transform="rotate(-14 53 200)" />
      <ellipse cx="147" cy="200" rx="14" ry="28" fill="#f97316" transform="rotate(14 147 200)" />
      <ellipse cx="49" cy="228" rx="16" ry="9" fill="#fbd38d" />
      <ellipse cx="151" cy="228" rx="16" ry="9" fill="#fbd38d" />

      {/* Ears */}
      <polygon points="44,64 60,20 82,64" fill="#f97316" />
      <polygon points="118,64 140,20 156,64" fill="#f97316" />
      <polygon points="50,62 62,27 77,62" fill="#fda4b8" />
      <polygon points="123,62 138,27 150,62" fill="#fda4b8" />

      {/* Head */}
      <circle cx="100" cy="90" r="64" fill="url(#tc-b)" />
      <circle cx="100" cy="90" r="64" fill="url(#tc-sh)" />

      {/* Forehead stripes */}
      <line x1="100" y1="30" x2="100" y2="52" stroke="#e8530a" strokeWidth="4.5" strokeLinecap="round" opacity="0.5" />
      <line x1="86" y1="33" x2="83" y2="53" stroke="#e8530a" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <line x1="114" y1="33" x2="117" y2="53" stroke="#e8530a" strokeWidth="3" strokeLinecap="round" opacity="0.4" />

      {/* Cheeks */}
      <ellipse cx="56" cy="103" rx="18" ry="12" fill="#fda4b8" opacity="0.5" />
      <ellipse cx="144" cy="103" rx="18" ry="12" fill="#fda4b8" opacity="0.5" />

      {/* Left eye */}
      <ellipse cx="76" cy="87" rx="18" ry="20" fill="white" />
      <circle cx="76" cy="88" r="13" fill="#4ade80" />
      <circle cx="76" cy="88" r="8" fill="#111" />
      <circle cx="71" cy="83" r="4" fill="white" />
      <motion.rect
        x="58" y="67" width="36" rx="4"
        fill="#f97316"
        animate={{ height: eyesBlink ? 22 : 0 }}
        transition={{ duration: 0.07 }}
      />

      {/* Right eye */}
      <ellipse cx="124" cy="87" rx="18" ry="20" fill="white" />
      <circle cx="124" cy="88" r="13" fill="#4ade80" />
      <circle cx="124" cy="88" r="8" fill="#111" />
      <circle cx="119" cy="83" r="4" fill="white" />
      <motion.rect
        x="106" y="67" width="36" rx="4"
        fill="#f97316"
        animate={{ height: eyesBlink ? 22 : 0 }}
        transition={{ duration: 0.07 }}
      />

      {/* Nose */}
      <polygon points="100,108 95,116 105,116" fill="#fda4b8" />
      <circle cx="100" cy="108" r="4" fill="#fda4b8" />

      {/* Mouth */}
      <motion.ellipse
        cx="100" cy="121" rx="11"
        fill={mouthOpen > 0.12 ? "#111" : "none"}
        stroke={mouthOpen > 0.12 ? "none" : "#884444"}
        strokeWidth="2"
        animate={{ ry: mouthOpen > 0.12 ? 2 + mouthOpen * 13 : 2 }}
        transition={{ duration: 0.07 }}
      />
      {mouthOpen <= 0.12 && (
        <path d="M 91 122 Q 100 128 109 122" fill="none" stroke="#884444" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Whiskers */}
      <line x1="57" y1="110" x2="87" y2="114" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <line x1="55" y1="116" x2="86" y2="116" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <line x1="57" y1="122" x2="87" y2="118" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <line x1="143" y1="110" x2="113" y2="114" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <line x1="145" y1="116" x2="114" y2="116" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <line x1="143" y1="122" x2="113" y2="118" stroke="#e5e7eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
    </motion.svg>
  );
}

// ─── Dog ──────────────────────────────────────────────────────────────────────
function DogSVG({ mouthOpen, eyesBlink, active, bassLevel }: CharSVGProps) {
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="w-full h-full"
      animate={{ y: active ? -(bassLevel * 12) : [0, -5, 0] }}
      transition={
        active
          ? { type: "spring", stiffness: 420, damping: 16 }
          : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <defs>
        <linearGradient id="dg-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="dg-sh" cx="32%" cy="28%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="dg-ear" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* Floppy ears */}
      <ellipse cx="48" cy="110" rx="24" ry="44" fill="url(#dg-ear)" />
      <ellipse cx="152" cy="110" rx="24" ry="44" fill="url(#dg-ear)" />
      <ellipse cx="43" cy="97" rx="8" ry="24" fill="#fde68a" opacity="0.28" transform="rotate(-8 43 97)" />
      <ellipse cx="157" cy="97" rx="8" ry="24" fill="#fde68a" opacity="0.28" transform="rotate(8 157 97)" />

      {/* Body */}
      <ellipse cx="100" cy="195" rx="52" ry="46" fill="url(#dg-b)" />
      <ellipse cx="100" cy="195" rx="52" ry="46" fill="url(#dg-sh)" />
      <ellipse cx="100" cy="192" rx="30" ry="33" fill="#fef3c7" opacity="0.88" />

      {/* Arms + paws */}
      <ellipse cx="53" cy="200" rx="14" ry="28" fill="#f59e0b" transform="rotate(-12 53 200)" />
      <ellipse cx="147" cy="200" rx="14" ry="28" fill="#f59e0b" transform="rotate(12 147 200)" />
      <ellipse cx="49" cy="228" rx="16" ry="9" fill="#fde68a" />
      <ellipse cx="151" cy="228" rx="16" ry="9" fill="#fde68a" />

      {/* Head */}
      <circle cx="100" cy="90" r="63" fill="url(#dg-b)" />
      <circle cx="100" cy="90" r="63" fill="url(#dg-sh)" />

      {/* Snout */}
      <ellipse cx="100" cy="109" rx="29" ry="22" fill="#fde68a" />

      {/* Left eye */}
      <ellipse cx="74" cy="85" rx="17" ry="19" fill="white" />
      <circle cx="74" cy="86" r="12" fill="#7c2d12" />
      <circle cx="74" cy="86" r="7.5" fill="#111" />
      <circle cx="69" cy="81" r="4" fill="white" />
      <motion.rect
        x="57" y="66" width="34" rx="4"
        fill="#f59e0b"
        animate={{ height: eyesBlink ? 20 : 0 }}
        transition={{ duration: 0.07 }}
      />

      {/* Right eye */}
      <ellipse cx="126" cy="85" rx="17" ry="19" fill="white" />
      <circle cx="126" cy="86" r="12" fill="#7c2d12" />
      <circle cx="126" cy="86" r="7.5" fill="#111" />
      <circle cx="121" cy="81" r="4" fill="white" />
      <motion.rect
        x="109" y="66" width="34" rx="4"
        fill="#f59e0b"
        animate={{ height: eyesBlink ? 20 : 0 }}
        transition={{ duration: 0.07 }}
      />

      {/* Nose */}
      <ellipse cx="100" cy="104" rx="14" ry="10" fill="#111" />
      <ellipse cx="97" cy="101" rx="5" ry="3" fill="#444" />
      <ellipse cx="99" cy="99" rx="3.5" ry="2.5" fill="white" opacity="0.4" />

      {/* Mouth */}
      <line x1="100" y1="114" x2="100" y2="119" stroke="#92400e" strokeWidth="2" />
      {mouthOpen > 0.08 ? (
        <motion.path
          animate={{ d: `M 84 119 Q 100 ${119 + mouthOpen * 15} 116 119` }}
          fill="#111"
          transition={{ duration: 0.07 }}
        />
      ) : (
        <path d="M 87 119 Q 100 125 113 119" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Tongue */}
      <motion.ellipse
        cx="100" cy="125"
        rx="9"
        fill="#f43f5e"
        animate={{ ry: mouthOpen > 0.2 ? 4 + mouthOpen * 8 : 0, cy: 122 + mouthOpen * 6 }}
        transition={{ duration: 0.07 }}
      />

      {/* Snout spots */}
      <circle cx="86" cy="113" r="4" fill="#d97706" opacity="0.3" />
      <circle cx="114" cy="113" r="4" fill="#d97706" opacity="0.3" />
    </motion.svg>
  );
}

// ─── Parrot ───────────────────────────────────────────────────────────────────
function ParrotSVG({ mouthOpen, eyesBlink, active, bassLevel }: CharSVGProps) {
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="w-full h-full"
      animate={{
        y: active ? -(bassLevel * 12) : [0, -6, 0],
        rotate: active ? bassLevel * 4 : 0,
      }}
      transition={
        active
          ? { type: "spring", stiffness: 400, damping: 16 }
          : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <defs>
        <linearGradient id="pg-h" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="pg-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <radialGradient id="pg-sh" cx="32%" cy="28%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="pg-tail" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Tail feathers */}
      <ellipse cx="100" cy="232" rx="12" ry="18" fill="url(#pg-tail)" />
      <ellipse cx="82" cy="228" rx="9" ry="14" fill="#3b82f6" transform="rotate(-16 82 228)" />
      <ellipse cx="118" cy="228" rx="9" ry="14" fill="#3b82f6" transform="rotate(16 118 228)" />
      <ellipse cx="68" cy="220" rx="7" ry="11" fill="#60a5fa" transform="rotate(-28 68 220)" />
      <ellipse cx="132" cy="220" rx="7" ry="11" fill="#60a5fa" transform="rotate(28 132 220)" />

      {/* Wings */}
      <ellipse cx="42" cy="168" rx="32" ry="52" fill="url(#pg-b)" transform="rotate(-22 42 168)" />
      <ellipse cx="158" cy="168" rx="32" ry="52" fill="url(#pg-b)" transform="rotate(22 158 168)" />
      <ellipse cx="36" cy="162" rx="16" ry="36" fill="#34d399" opacity="0.42" transform="rotate(-22 36 162)" />
      <ellipse cx="164" cy="162" rx="16" ry="36" fill="#34d399" opacity="0.42" transform="rotate(22 164 162)" />
      <line x1="56" y1="148" x2="36" y2="212" stroke="#059669" strokeWidth="1.5" opacity="0.38" />
      <line x1="144" y1="148" x2="164" y2="212" stroke="#059669" strokeWidth="1.5" opacity="0.38" />

      {/* Body */}
      <ellipse cx="100" cy="192" rx="48" ry="48" fill="url(#pg-b)" />
      <ellipse cx="100" cy="192" rx="48" ry="48" fill="url(#pg-sh)" />
      <ellipse cx="100" cy="190" rx="24" ry="26" fill="#fbbf24" opacity="0.88" />
      <ellipse cx="100" cy="190" rx="14" ry="16" fill="#f97316" opacity="0.6" />

      {/* Head */}
      <circle cx="100" cy="88" r="60" fill="url(#pg-h)" />
      <circle cx="100" cy="88" r="60" fill="url(#pg-sh)" />

      {/* Feather crest */}
      <ellipse cx="100" cy="32" rx="10" ry="16" fill="#dc2626" transform="rotate(-5 100 32)" />
      <ellipse cx="88" cy="35" rx="7" ry="12" fill="#b91c1c" transform="rotate(-18 88 35)" />
      <ellipse cx="112" cy="35" rx="7" ry="12" fill="#b91c1c" transform="rotate(18 112 35)" />
      <ellipse cx="78" cy="42" rx="5" ry="8" fill="#ef4444" opacity="0.55" transform="rotate(-30 78 42)" />
      <ellipse cx="122" cy="42" rx="5" ry="8" fill="#ef4444" opacity="0.55" transform="rotate(30 122 42)" />

      {/* Cheek patches */}
      <circle cx="62" cy="101" r="18" fill="#fbbf24" opacity="0.78" />
      <circle cx="138" cy="101" r="18" fill="#fbbf24" opacity="0.78" />

      {/* Left eye */}
      <circle cx="74" cy="85" r="19" fill="white" />
      <circle cx="74" cy="86" r="13" fill="#1e40af" />
      <circle cx="74" cy="86" r="8" fill="#111" />
      <circle cx="69" cy="81" r="4.5" fill="white" />
      <circle cx="74" cy="85" r="19" fill="none" stroke="#b91c1c" strokeWidth="3" />
      <motion.rect
        x="55" y="66" width="38" rx="4"
        fill="#dc2626"
        animate={{ height: eyesBlink ? 21 : 0 }}
        transition={{ duration: 0.07 }}
      />

      {/* Right eye */}
      <circle cx="126" cy="85" r="19" fill="white" />
      <circle cx="126" cy="86" r="13" fill="#1e40af" />
      <circle cx="126" cy="86" r="8" fill="#111" />
      <circle cx="121" cy="81" r="4.5" fill="white" />
      <circle cx="126" cy="85" r="19" fill="none" stroke="#b91c1c" strokeWidth="3" />
      <motion.rect
        x="107" y="66" width="38" rx="4"
        fill="#dc2626"
        animate={{ height: eyesBlink ? 21 : 0 }}
        transition={{ duration: 0.07 }}
      />

      {/* Beak upper (static) */}
      <path d="M 86 108 Q 100 104 114 108 Q 108 118 100 120 Q 92 118 86 108 Z" fill="#f97316" />
      <line x1="90" y1="110" x2="110" y2="110" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

      {/* Beak lower (animated) */}
      <motion.path
        fill="#ea580c"
        animate={{
          d: mouthOpen > 0.1
            ? `M 88 120 Q 100 ${120 + mouthOpen * 18} 112 120 Q 106 ${116 + mouthOpen * 10} 100 ${114 + mouthOpen * 8} Q 94 ${116 + mouthOpen * 10} 88 120 Z`
            : "M 88 120 Q 100 124 112 120 Q 106 122 100 121 Q 94 122 88 120 Z",
        }}
        transition={{ duration: 0.08 }}
      />
    </motion.svg>
  );
}

// ─── Robot ────────────────────────────────────────────────────────────────────
function RobotSVG({ mouthOpen, eyesBlink, active, bassLevel }: CharSVGProps) {
  const bars = Array.from({ length: 10 }, (_, i) => i);
  const chestBars = Array.from({ length: 8 }, (_, i) => i);
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="w-full h-full"
      animate={{ y: active ? -(bassLevel * 9) : [0, -4, 0] }}
      transition={
        active
          ? { type: "spring", stiffness: 320, damping: 18 }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <defs>
        <linearGradient id="rb-m" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="rb-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="rb-gl" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.25" />
        </radialGradient>
      </defs>

      {/* Antenna */}
      <line x1="100" y1="10" x2="100" y2="42" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <motion.circle
        cx="100" cy="8" r="8" fill="#00e5ff"
        animate={{ opacity: [1, 0.35, 1], r: active ? [8, 11, 8] : [8, 8, 8] }}
        transition={{ duration: active ? 0.35 : 1.6, repeat: Infinity }}
      />
      <circle cx="100" cy="8" r="4" fill="white" opacity="0.5" />

      {/* Head */}
      <rect x="32" y="42" width="136" height="106" rx="20" fill="url(#rb-m)" />
      <rect x="38" y="48" width="58" height="36" rx="12" fill="white" opacity="0.09" />
      <rect x="40" y="122" width="120" height="18" rx="9" fill="#1e3a8a" opacity="0.28" />

      {/* Side panels */}
      <rect x="18" y="64" width="14" height="36" rx="7" fill="#3b82f6" />
      <rect x="168" y="64" width="14" height="36" rx="7" fill="#3b82f6" />
      {[70, 78, 86, 94].map((y) => (
        <circle key={y} cx="25" cy={y} r="2" fill="#93c5fd" opacity="0.65" />
      ))}
      {[70, 78, 86, 94].map((y) => (
        <circle key={y} cx="175" cy={y} r="2" fill="#93c5fd" opacity="0.65" />
      ))}

      {/* Corner bolts */}
      {[[46, 56], [154, 56], [46, 134], [154, 134]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="6" fill="#1e40af" />
          <circle cx={cx} cy={cy} r="3" fill="#60a5fa" />
        </g>
      ))}

      {/* LED eye sockets */}
      <rect x="50" y="62" width="38" height="28" rx="8" fill="#0c1445" />
      <rect x="112" y="62" width="38" height="28" rx="8" fill="#0c1445" />
      <motion.rect
        x="54" y="66" width="30" height="20" rx="5"
        fill="url(#rb-gl)"
        animate={{ opacity: eyesBlink ? 0 : [1, 0.55, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <motion.rect
        x="116" y="66" width="30" height="20" rx="5"
        fill="url(#rb-gl)"
        animate={{ opacity: eyesBlink ? 0 : [1, 0.55, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
      />
      {/* Scanlines */}
      <motion.line
        x1="58" x2="80" stroke="#a5f3fc" strokeWidth="2" opacity="0.7"
        animate={{ y1: eyesBlink ? 66 : [66, 86, 66], y2: eyesBlink ? 66 : [66, 86, 66] }}
        transition={{ duration: 0.65, repeat: Infinity, ease: "linear" }}
      />
      <motion.line
        x1="120" x2="142" stroke="#a5f3fc" strokeWidth="2" opacity="0.7"
        animate={{ y1: eyesBlink ? 66 : [66, 86, 66], y2: eyesBlink ? 66 : [66, 86, 66] }}
        transition={{ duration: 0.65, repeat: Infinity, ease: "linear", delay: 0.3 }}
      />

      {/* Mouth LED panel */}
      <rect x="52" y="100" width="96" height="32" rx="8" fill="#0c1445" />
      <motion.g animate={{ opacity: mouthOpen > 0.05 ? 1 : 0.22 }} transition={{ duration: 0.08 }}>
        {bars.map((i) => {
          const peak = Math.sin((i / 10) * Math.PI + 0.3);
          const h = mouthOpen > 0.05 ? 4 + mouthOpen * (20 - 4) * peak : 4;
          return (
            <motion.rect
              key={i}
              x={56 + i * 9} rx="1.5" width="5"
              fill="#00e5ff"
              animate={{ height: h, y: 132 - h }}
              transition={{ duration: 0.08, delay: i * 0.01 }}
            />
          );
        })}
      </motion.g>

      {/* Body */}
      <rect x="36" y="152" width="128" height="82" rx="18" fill="url(#rb-b)" />
      <rect x="56" y="163" width="88" height="52" rx="8" fill="#0c1445" />
      {chestBars.map((i) => (
        <motion.rect
          key={i}
          x={60 + i * 11} width="7" rx="2" fill="#00e5ff" opacity="0.82"
          animate={{
            height: active ? [4, 4 + bassLevel * 30, 4] : [4, 6 + i * 1.5, 4],
            y: active ? [211, 211 - bassLevel * 30, 211] : [207 - i * 1.5, 205 - i * 1.5, 207 - i * 1.5],
          }}
          transition={{ duration: active ? 0.22 : 1.2, delay: i * 0.07, repeat: Infinity }}
        />
      ))}

      {/* Arms + hands */}
      <rect x="14" y="156" width="22" height="56" rx="11" fill="#3b82f6" />
      <rect x="164" y="156" width="22" height="56" rx="11" fill="#3b82f6" />
      <rect x="12" y="208" width="26" height="20" rx="10" fill="#60a5fa" />
      <rect x="162" y="208" width="26" height="20" rx="10" fill="#60a5fa" />

      {/* Legs */}
      <rect x="56" y="230" width="30" height="14" rx="7" fill="#1d4ed8" />
      <rect x="114" y="230" width="30" height="14" rx="7" fill="#1d4ed8" />
    </motion.svg>
  );
}

// ─── Ghost ────────────────────────────────────────────────────────────────────
function GhostSVG({ mouthOpen, eyesBlink, active, bassLevel }: CharSVGProps) {
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="w-full h-full"
      animate={{
        y: active ? -(bassLevel * 12) : [0, -9, 0],
        rotate: active ? 0 : [0, 1.5, 0, -1.5, 0],
      }}
      transition={
        active
          ? { type: "spring", stiffness: 300, damping: 15 }
          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <defs>
        <radialGradient id="gh-b" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="55%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <radialGradient id="gh-in" cx="50%" cy="38%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Outer aura */}
      <ellipse cx="100" cy="115" rx="76" ry="88" fill="#7c3aed" opacity="0.07" />

      {/* Wisps */}
      <motion.ellipse cx="28" cy="96" rx="10" ry="17" fill="#c4b5fd" opacity="0.32"
        animate={{ y: [-10, 9, -10], x: [-5, 5, -5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.ellipse cx="172" cy="118" rx="8" ry="13" fill="#c4b5fd" opacity="0.26"
        animate={{ y: [9, -10, 9], x: [5, -5, 5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.ellipse cx="162" cy="72" rx="6" ry="10" fill="#c4b5fd" opacity="0.2"
        animate={{ y: [-6, 7, -6] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      <motion.ellipse cx="38" cy="152" rx="7" ry="11" fill="#c4b5fd" opacity="0.18"
        animate={{ y: [6, -8, 6] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
      />

      {/* Body blob */}
      <path
        d="M 38 120 C 33 68 66 26 100 24 C 134 26 167 68 162 120
           L 162 200 Q 149 188 136 200 Q 124 212 112 200
           Q 100 188 88 200 Q 76 212 64 200 Q 51 188 38 200 Z"
        fill="url(#gh-b)"
      />
      <path
        d="M 38 120 C 33 68 66 26 100 24 C 134 26 167 68 162 120
           L 162 200 Q 149 188 136 200 Q 124 212 112 200
           Q 100 188 88 200 Q 76 212 64 200 Q 51 188 38 200 Z"
        fill="url(#gh-in)"
      />

      {/* Left eye */}
      <ellipse cx="76" cy="106" rx="22" ry="24" fill="white" opacity="0.92" />
      <motion.ellipse
        cx="76" cy="108" rx="15"
        fill="#5b21b6"
        animate={{ ry: eyesBlink ? 2 : 17 }}
        transition={{ duration: 0.07 }}
      />
      <motion.circle
        cx="76" cy="108" r="9"
        fill="#1e0536"
        animate={{ r: eyesBlink ? 1 : 9 }}
        transition={{ duration: 0.07 }}
      />
      <circle cx="70" cy="102" r="5" fill="white" opacity="0.72" />

      {/* Right eye */}
      <ellipse cx="124" cy="106" rx="22" ry="24" fill="white" opacity="0.92" />
      <motion.ellipse
        cx="124" cy="108" rx="15"
        fill="#5b21b6"
        animate={{ ry: eyesBlink ? 2 : 17 }}
        transition={{ duration: 0.07 }}
      />
      <motion.circle
        cx="124" cy="108" r="9"
        fill="#1e0536"
        animate={{ r: eyesBlink ? 1 : 9 }}
        transition={{ duration: 0.07 }}
      />
      <circle cx="118" cy="102" r="5" fill="white" opacity="0.72" />

      {/* Mouth */}
      <motion.ellipse
        cx="100" cy="142" rx="13"
        fill="#1e0536"
        animate={{ ry: 2 + mouthOpen * 15, cy: 140 + mouthOpen * 3 }}
        transition={{ duration: 0.07 }}
      />
      {mouthOpen > 0.3 && (
        <>
          <rect x="92" y="140" width="5" height="7" rx="1.5" fill="white" opacity="0.82" />
          <rect x="100" y="140" width="5" height="7" rx="1.5" fill="white" opacity="0.82" />
          <rect x="108" y="140" width="5" height="7" rx="1.5" fill="white" opacity="0.82" />
        </>
      )}

      {/* Sparkles */}
      <motion.text x="34" y="68" fontSize="14" fill="#c4b5fd"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >✦</motion.text>
      <motion.text x="154" y="54" fontSize="11" fill="#c4b5fd"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
      >✦</motion.text>
      <motion.text x="18" y="138" fontSize="9" fill="#c4b5fd"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >✦</motion.text>
      <motion.text x="170" y="156" fontSize="10" fill="#c4b5fd"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
      >✦</motion.text>
    </motion.svg>
  );
}

// ─── Frequency visualizer ─────────────────────────────────────────────────────
function FrequencyVisualizer({
  analyserRef,
  barColor,
  active,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  barColor: string;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_COUNT = 38;

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);

      const CX = W / 2;
      const CY = H * 0.86;
      const MIN_R = H * 0.4;
      const MAX_R = H * 0.74;

      const analyser = analyserRef.current;
      const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      if (analyser && freqData) analyser.getByteFrequencyData(freqData);

      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / (BAR_COUNT - 1);
        const angle = Math.PI + t * Math.PI;

        let norm = 0;
        if (freqData && active) {
          const bin = Math.floor(t * freqData.length * 0.5);
          norm = freqData[bin] / 255;
        } else {
          norm = 0.04 + Math.abs(Math.sin(Date.now() / 700 + i * 0.45)) * 0.05;
        }

        const outerR = MIN_R + norm * (MAX_R - MIN_R);
        const x1 = CX + Math.cos(angle) * MIN_R;
        const y1 = CY + Math.sin(angle) * MIN_R;
        const x2 = CX + Math.cos(angle) * outerR;
        const y2 = CY + Math.sin(angle) * outerR;

        ctx!.beginPath();
        ctx!.moveTo(x1, y1);
        ctx!.lineTo(x2, y2);
        ctx!.strokeStyle = barColor;
        ctx!.lineWidth = active ? 4.5 : 3;
        ctx!.lineCap = "round";
        ctx!.globalAlpha = active ? 0.12 + norm * 0.88 : 0.18;
        ctx!.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef, barColor, active]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ─── Character map ─────────────────────────────────────────────────────────────
const CHARACTER_COMPONENTS: Record<CharacterId, React.FC<CharSVGProps>> = {
  tomcat: TomcatSVG,
  dog: DogSVG,
  parrot: ParrotSVG,
  robot: RobotSVG,
  ghost: GhostSVG,
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TalkingCharactersPage() {
  const [selectedId, setSelectedId] = useState<CharacterId>("tomcat");
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "prompt" | "denied">("unknown");

  // Audio-reactive animation state
  const [mouthOpen, setMouthOpen] = useState(0);
  const [bassLevel, setBassLevel] = useState(0);
  const [eyesBlink, setEyesBlink] = useState(false);

  // Audio refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopingRef = useRef(false);
  const selectedRef = useRef<typeof characters[number]>(characters[0]);
  const micNodesRef = useRef<{
    source: MediaStreamAudioSourceNode;
    hpf: BiquadFilterNode;
    comp: DynamicsCompressorNode;
    analyser: AnalyserNode;
  } | null>(null);
  const animRafRef = useRef<number>(0);

  const selected = characters.find((c) => c.id === selectedId)!;
  selectedRef.current = selected;

  // Audio analysis loop — drives mouthOpen and bassLevel
  useEffect(() => {
    const freqData = new Uint8Array(256);
    let frame = 0;

    const loop = () => {
      animRafRef.current = requestAnimationFrame(loop);
      frame++;
      if (frame % 2 !== 0) return;

      const analyser = analyserRef.current;
      if (!analyser) {
        setMouthOpen((p) => p * 0.82);
        setBassLevel((p) => p * 0.82);
        return;
      }

      analyser.getByteFrequencyData(freqData);
      let bass = 0;
      for (let i = 0; i < 5; i++) bass += freqData[i];
      bass = (bass / 5) / 255;

      const td = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(td);
      const rms = getRMS(td);

      setBassLevel((p) => p * 0.55 + bass * 0.45);
      setMouthOpen((p) => p * 0.45 + Math.min(rms * 7, 1) * 0.55);
    };

    animRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRafRef.current);
  }, []);

  // Periodic eye blink
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const doBlink = () => {
      setEyesBlink(true);
      t = setTimeout(() => {
        setEyesBlink(false);
        t = setTimeout(doBlink, 2200 + Math.random() * 2800);
      }, 130);
    };
    t = setTimeout(doBlink, 1200 + Math.random() * 1200);
    return () => clearTimeout(t);
  }, []);

  const clearVAD = () => {
    if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
  };
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const getOrCreateCtx = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const startListening = useCallback(async () => {
    if (!loopingRef.current) return;
    chunksRef.current = [];
    setPhase("listening");

    let stream = streamRef.current;
    if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
        });
        streamRef.current = stream;
      } catch {
        setErrorMsg("Microphone access lost. Tap again to restart.");
        setPhase("error");
        setStarted(false);
        loopingRef.current = false;
        return;
      }
    }

    if (micNodesRef.current) {
      try {
        micNodesRef.current.source.disconnect();
        micNodesRef.current.hpf.disconnect();
        micNodesRef.current.comp.disconnect();
        micNodesRef.current.analyser.disconnect();
      } catch { /* already disconnected */ }
      micNodesRef.current = null;
    }

    const ctx = getOrCreateCtx();
    const micSource = ctx.createMediaStreamSource(stream);
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass"; hpf.frequency.value = 80;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -30; comp.ratio.value = 12;
    comp.attack.value = 0.002; comp.release.value = 0.15;
    const micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 512; micAnalyser.smoothingTimeConstant = 0.7;
    micSource.connect(hpf); hpf.connect(comp); comp.connect(micAnalyser);
    analyserRef.current = micAnalyser;
    micNodesRef.current = { source: micSource, hpf, comp, analyser: micAnalyser };

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      clearVAD();
      analyserRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (chunksRef.current.length > 0 && loopingRef.current) {
        playAudio(blob);
      } else if (loopingRef.current) {
        startListening();
      }
    };

    const VAD_SILENCE_MS = 700;
    const VAD_MAX_MS = 15000;
    const timeDomain = new Uint8Array(micAnalyser.fftSize);
    let speechStart = 0, lastLoudTime = 0, speechSeen = false;
    let ambientRMS = 0.02;
    const calibSamples: number[] = [];
    const calibEnd = Date.now() + 400;

    vadIntervalRef.current = setInterval(() => {
      if (!loopingRef.current) { clearVAD(); return; }
      micAnalyser.getByteTimeDomainData(timeDomain);
      const rms = getRMS(timeDomain);

      if (Date.now() < calibEnd) {
        calibSamples.push(rms);
        if (calibSamples.length > 3)
          ambientRMS = calibSamples.reduce((a, b) => a + b, 0) / calibSamples.length;
        return;
      }

      const threshold = Math.max(ambientRMS * 2.5, 0.025);
      if (rms > threshold) {
        if (!speechSeen) {
          recorder.start();
          speechStart = Date.now();
          lastLoudTime = Date.now();
          speechSeen = true;
          setPhase("speech");
        } else {
          lastLoudTime = Date.now();
        }
      }

      const silenced = speechSeen && Date.now() - lastLoudTime > VAD_SILENCE_MS;
      const timedOut = speechSeen && Date.now() - speechStart > VAD_MAX_MS;
      if (silenced || timedOut) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }
    }, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playAudio = useCallback(async (blob: Blob) => {
    if (!loopingRef.current) return;
    setPhase("processing");
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = getOrCreateCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = selectedRef.current.playbackRate;
      sourceRef.current = source;

      const hpf = ctx.createBiquadFilter();
      hpf.type = "highpass"; hpf.frequency.value = 80;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.25;
      const playAnalyser = ctx.createAnalyser();
      playAnalyser.fftSize = 512; playAnalyser.smoothingTimeConstant = 0.8;
      analyserRef.current = playAnalyser;

      source.connect(hpf); hpf.connect(comp);
      let lastNode: AudioNode = comp;

      const sel = selectedRef.current;
      if ("filter" in sel && sel.filter) {
        const f = ctx.createBiquadFilter();
        f.type = sel.filter.type; f.frequency.value = sel.filter.frequency;
        if (sel.filter.gain) f.gain.value = sel.filter.gain;
        lastNode.connect(f); lastNode = f;
      }
      if ("distortion" in sel && sel.distortion) {
        const dist = createDistortion(ctx);
        lastNode.connect(dist); lastNode = dist;
      }
      lastNode.connect(playAnalyser);

      if ("reverb" in sel && sel.reverb) {
        const reverb = createReverb(ctx);
        const dry = ctx.createGain(); dry.gain.value = 0.3;
        const wet = ctx.createGain(); wet.gain.value = 0.85;
        lastNode.connect(dry); dry.connect(ctx.destination);
        lastNode.connect(reverb); reverb.connect(wet); wet.connect(ctx.destination);
      } else {
        lastNode.connect(ctx.destination);
      }

      source.start();
      setPhase("playing");
      let endedFired = false;
      const onEnded = () => {
        if (endedFired) return;
        endedFired = true;
        analyserRef.current = null;
        if (loopingRef.current) startListening();
        else setPhase("idle");
      };
      source.onended = onEnded;
      const fallbackMs = (audioBuffer.duration * 1000 + 500) / source.playbackRate.value;
      setTimeout(onEnded, Math.max(fallbackMs, 900));
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not process audio. Retrying…");
      setPhase("error");
      analyserRef.current = null;
      if (loopingRef.current) setTimeout(() => startListening(), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startListening]);

  useEffect(() => {
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        setMicPermission(result.state as "granted" | "prompt" | "denied");
        result.onchange = () => setMicPermission(result.state as "granted" | "prompt" | "denied");
      })
      .catch(() => setMicPermission("prompt"));
  }, []);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      setErrorMsg("");
    } catch {
      setMicPermission("denied");
      setErrorMsg("Microphone access denied.");
    }
  };

  const handleStart = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      streamRef.current = stream;
      loopingRef.current = true;
      setStarted(true);
      await startListening();
    } catch {
      setMicPermission("denied");
      setErrorMsg("Microphone access denied. Please allow mic permissions.");
      setPhase("error");
    }
  };

  const handleClose = () => {
    loopingRef.current = false;
    clearVAD();
    if (micNodesRef.current) {
      try {
        micNodesRef.current.source.disconnect();
        micNodesRef.current.hpf.disconnect();
        micNodesRef.current.comp.disconnect();
        micNodesRef.current.analyser.disconnect();
      } catch { /* ignore */ }
      micNodesRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    try { sourceRef.current?.stop(); } catch { /* ignore */ }
    sourceRef.current = null;
    analyserRef.current = null;
    stopStream();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setStarted(false);
    setPhase("idle");
    setErrorMsg("");
  };

  const switchCharacter = (id: CharacterId) => {
    setSelectedId(id);
    if (!loopingRef.current) return;
    clearVAD();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    try { sourceRef.current?.stop(); } catch { /* ignore */ }
    sourceRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    setTimeout(() => { if (loopingRef.current) startListening(); }, 150);
  };

  useEffect(
    () => () => {
      loopingRef.current = false;
      clearVAD();
      stopStream();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const isActive = phase === "speech" || phase === "playing";
  const CharComponent = CHARACTER_COMPONENTS[selectedId];

  return (
    <main className="h-screen bg-[#050508] text-white overflow-hidden flex flex-col">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className={`absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full blur-[180px] bg-gradient-to-br ${selected.gradient}`}
          animate={{ opacity: isActive ? 0.14 : 0.06 }}
          transition={{ duration: 1.2 }}
        />
      </div>

      <div className="relative flex flex-col items-center max-w-lg mx-auto w-full px-4 pt-4 pb-4 h-full">
        {/* Header */}
        <div className="self-stretch flex items-center justify-between mb-3">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href="/projects/fun-stuff"
              className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors group"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
              Fun Stuff
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-semibold text-white/35 tracking-[0.18em] uppercase"
          >
            Talking Characters
          </motion.p>

          <div className="w-14 flex justify-end">
            <AnimatePresence>
              {started && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClose}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-white/15 text-white/40 hover:text-white/70 hover:border-white/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Character stage */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="relative flex items-center justify-center"
              style={{ width: "min(270px, 56vw)", height: "min(270px, 56vw)" }}
            >
              {/* Frequency visualizer canvas */}
              <FrequencyVisualizer
                analyserRef={analyserRef}
                barColor={selected.barColor}
                active={isActive}
              />

              {/* SVG character */}
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <CharComponent
                  mouthOpen={mouthOpen}
                  eyesBlink={eyesBlink}
                  active={isActive}
                  bassLevel={bassLevel}
                />
              </div>

              {/* Ripple rings when playing */}
              <AnimatePresence>
                {phase === "playing" &&
                  [0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${selected.gradient} pointer-events-none`}
                      initial={{ scale: 0.5, opacity: 0.28 }}
                      animate={{ scale: 1.9 + i * 0.32, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.7, delay: i * 0.42, repeat: Infinity }}
                    />
                  ))}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Character name + status */}
          <div className="flex flex-col items-center mt-3 gap-1.5">
            <motion.p
              key={selectedId + "-name"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold tracking-tight"
            >
              {selected.name}
            </motion.p>
            <p className="text-[10px] text-white/35 uppercase tracking-[0.2em]">
              {selected.label} voice
            </p>

            {/* Phase badges */}
            <AnimatePresence mode="wait">
              {phase === "listening" && (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/6 border border-white/10 rounded-full"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-white/45"
                      animate={{ height: ["3px", "12px", "3px"] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                    />
                  ))}
                  <span className="text-xs text-white/45 ml-0.5">Listening…</span>
                </motion.div>
              )}
              {phase === "speech" && (
                <motion.div
                  key="speech"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/14 border border-red-500/28 rounded-full"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.25, 1] }}
                    transition={{ repeat: Infinity, duration: 0.72 }}
                  />
                  <span className="text-xs text-red-400">Capturing…</span>
                </motion.div>
              )}
              {phase === "playing" && (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: selected.accentColor }}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Playing back…
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Character selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex gap-2 mt-3 mb-3"
        >
          {characters.map((c, idx) => (
            <motion.button
              key={c.id}
              onClick={() => switchCharacter(c.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + idx * 0.05 }}
              className={`relative flex flex-col items-center gap-1 px-2.5 py-2.5 rounded-2xl border transition-all duration-300 ${
                selectedId === c.id
                  ? `bg-gradient-to-b ${c.gradient} border-transparent shadow-lg`
                  : "border-white/10 bg-white/5 hover:border-white/18 hover:bg-white/8"
              }`}
              style={{ minWidth: 50 }}
            >
              <span className="text-[22px] leading-none">{c.emoji}</span>
              <span
                className={`text-[8px] font-bold uppercase tracking-wide ${
                  selectedId === c.id ? "text-white" : "text-white/35"
                }`}
              >
                {c.name}
              </span>
              {selectedId === c.id && (
                <motion.div
                  layoutId="sel-dot"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-1 rounded-full bg-white/55"
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Mic / CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex flex-col items-center gap-2.5 w-full"
        >
          <AnimatePresence mode="wait">
            {!started ? (
              micPermission === "denied" ? (
                <motion.div
                  key="denied"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center max-w-xs"
                >
                  <MicOff className="w-6 h-6 text-red-400" />
                  <p className="text-sm text-red-300 leading-relaxed">
                    Microphone blocked. Allow it in your browser settings, then refresh.
                  </p>
                  <button
                    onClick={requestMic}
                    className="text-xs text-white/40 hover:text-white/70 underline transition-colors"
                  >
                    Try again
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="start"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={micPermission === "granted" ? handleStart : requestMic}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative flex items-center gap-2.5 px-10 py-3.5 rounded-full font-bold text-base bg-gradient-to-r ${selected.gradient} text-white shadow-2xl overflow-hidden`}
                >
                  <Mic className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">
                    {micPermission === "granted" ? "Start Talking" : "Enable Microphone"}
                  </span>
                  {/* Shimmer */}
                  <motion.span
                    className="absolute inset-0 bg-white/20"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    style={{ clipPath: "polygon(0 0, 30% 0, 50% 100%, 20% 100%)" }}
                  />
                </motion.button>
              )
            ) : (
              <motion.div
                key="active-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1.5"
              >
                <AnimatePresence mode="wait">
                  {phase === "processing" && (
                    <motion.div
                      key="proc"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-white/45"
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/55"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
                      />
                      Applying {selected.name} voice…
                    </motion.div>
                  )}
                  {phase === "error" && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg || "Something went wrong"}
                    </motion.div>
                  )}
                  {(phase === "listening" || phase === "idle") && (
                    <p className="text-xs text-white/28 text-center">
                      Speak now — plays back in {selected.name}'s voice
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-white/18 text-center">
            Your voice never leaves this device · Noise cancellation on · Max 15s
          </p>
        </motion.div>
      </div>
    </main>
  );
}
