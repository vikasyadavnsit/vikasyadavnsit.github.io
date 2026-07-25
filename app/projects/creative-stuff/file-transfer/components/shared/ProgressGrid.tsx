"use client";

import { motion } from "framer-motion";

export type ChunkState = "pending" | "received" | "failed";

interface ProgressGridProps {
  chunkCount: number;
  states: ChunkState[]; // length === chunkCount
  accent: string;
}

export function ProgressGrid({ chunkCount, states, accent }: ProgressGridProps) {
  const receivedCount = states.filter((s) => s === "received").length;
  const failedCount = states.filter((s) => s === "failed").length;
  const cellSize = chunkCount > 400 ? 6 : chunkCount > 150 ? 8 : chunkCount > 60 ? 10 : 14;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {receivedCount} / {chunkCount} chunks received
          {failedCount > 0 && <span className="text-red-400"> · {failedCount} failed</span>}
        </span>
        <span>{Math.round((receivedCount / Math.max(1, chunkCount)) * 100)}%</span>
      </div>
      <div className="flex flex-wrap gap-[3px] p-3 rounded-2xl border border-border bg-card/30 max-h-40 overflow-y-auto">
        {states.map((state, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              backgroundColor:
                state === "received" ? accent : state === "failed" ? "#f87171" : "rgba(148,163,184,0.15)",
              scale: state === "received" ? 1 : 0.92,
            }}
            transition={{ duration: 0.2 }}
            style={{ width: cellSize, height: cellSize }}
            className="rounded-[3px]"
            title={`Chunk ${i}: ${state}`}
          />
        ))}
      </div>
    </div>
  );
}
