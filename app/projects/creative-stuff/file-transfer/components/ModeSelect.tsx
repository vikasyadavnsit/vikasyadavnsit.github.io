"use client";

import { motion } from "framer-motion";
import { QrCode, Radio, Upload, Download } from "lucide-react";

export type Mode = "qr" | "audio";
export type Role = "sender" | "receiver";

interface ModeSelectProps {
  onSelect: (mode: Mode, role: Role) => void;
  accent: string;
}

const OPTIONS: Array<{ mode: Mode; role: Role; title: string; description: string; icon: typeof QrCode }> = [
  {
    mode: "qr",
    role: "sender",
    title: "QR · Send",
    description: "Upload a file and cycle it through QR codes on screen.",
    icon: Upload,
  },
  {
    mode: "qr",
    role: "receiver",
    title: "QR · Receive",
    description: "Scan the sender's screen with your camera to rebuild the file.",
    icon: QrCode,
  },
  {
    mode: "audio",
    role: "sender",
    title: "Audio · Send",
    description: "Upload a small file and transmit it as sound.",
    icon: Radio,
  },
  {
    mode: "audio",
    role: "receiver",
    title: "Audio · Receive",
    description: "Listen for the sender's tones and reconstruct the file.",
    icon: Download,
  },
];

export function ModeSelect({ onSelect, accent }: ModeSelectProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {OPTIONS.map((opt, i) => (
        <motion.button
          key={`${opt.mode}-${opt.role}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={() => onSelect(opt.mode, opt.role)}
          className="group text-left p-8 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-300"
        >
          <div
            className="inline-flex p-4 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300"
            style={{ background: `${accent}22` }}
          >
            <opt.icon className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h3 className="text-xl font-bold mb-2">{opt.title}</h3>
          <p className="text-sm text-muted-foreground">{opt.description}</p>
        </motion.button>
      ))}
    </div>
  );
}
