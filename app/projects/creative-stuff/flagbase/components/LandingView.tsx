"use client";
import { motion } from "framer-motion";
import { ToggleLeft, Target, Code, Zap, ArrowRight } from "lucide-react";

interface Props {
  onGetStarted: () => void;
  accent: string;
  accentGlow: string;
}

const features = [
  {
    icon: ToggleLeft,
    title: "Multi-Environment Flags",
    desc: "Manage flags independently across development, staging, and production. Each environment has its own state.",
  },
  {
    icon: Target,
    title: "Targeting Strategies",
    desc: "Default on/off, gradual rollout by percentage, or exact user ID allowlists — all configurable per environment.",
  },
  {
    icon: Code,
    title: "Drop-in SDK",
    desc: "One class, zero dependencies. Paste the snippet and start gating features in any JS project instantly.",
  },
];

export default function LandingView({ onGetStarted, accent, accentGlow }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-8"
          style={{ borderColor: accent, color: accent, background: accentGlow }}
        >
          <Zap className="w-3.5 h-3.5" />
          Open Source · Self-Hosted · Zero Dependencies
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6">
          Flag<span style={{ color: accent }}>base</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          Feature flag management for modern teams. Ship dark, control rollouts,
          target users — all without a backend.
        </p>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: accent, color: "#fff" }}
        >
          Open Dashboard <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full"
      >
        {features.map((f, i) => (
          <div
            key={i}
            className="p-8 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl text-left"
          >
            <div
              className="inline-flex p-3 rounded-xl mb-6"
              style={{ background: accentGlow }}
            >
              <f.icon className="w-6 h-6" style={{ color: accent }} />
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-sm text-muted-foreground"
      >
        Backed by Firebase Realtime DB · Shared public workspace
      </motion.p>
    </div>
  );
}
