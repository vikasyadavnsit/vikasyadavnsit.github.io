"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Radio, QrCode } from "lucide-react";
import { ModeSelect, type Mode, type Role } from "./components/ModeSelect";
import { QrSenderView } from "./components/qr/QrSenderView";
import { QrReceiverView } from "./components/qr/QrReceiverView";
import { AudioSenderView } from "./components/audio/AudioSenderView";
import { AudioReceiverView } from "./components/audio/AudioReceiverView";

const ACCENT = "#22d3ee";

export default function FileTransferPage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const active = mode !== null && role !== null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20">
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
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #0891b2)` }}
            >
              <Radio className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
                File <span className="text-muted-foreground">Transfer</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Move a file between two devices using nothing but a camera or a microphone.
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!active ? (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ModeSelect accent={ACCENT} onSelect={(m, r) => { setMode(m); setRole(r); }} />
            </motion.div>
          ) : (
            <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {mode === "qr" ? <QrCode className="w-4 h-4" style={{ color: ACCENT }} /> : <Radio className="w-4 h-4" style={{ color: ACCENT }} />}
                  <span className="capitalize">{mode}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="capitalize">{role}</span>
                </div>
                <button
                  onClick={() => { setMode(null); setRole(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
                >
                  Change Mode
                </button>
              </div>

              {mode === "qr" && role === "sender" && <QrSenderView accent={ACCENT} />}
              {mode === "qr" && role === "receiver" && <QrReceiverView accent={ACCENT} />}
              {mode === "audio" && role === "sender" && <AudioSenderView accent={ACCENT} />}
              {mode === "audio" && role === "receiver" && <AudioReceiverView accent={ACCENT} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
