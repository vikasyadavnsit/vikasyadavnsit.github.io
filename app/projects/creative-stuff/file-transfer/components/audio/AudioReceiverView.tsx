"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, AlertTriangle, Mic } from "lucide-react";
import { type Manifest } from "../../lib/chunking";
import { createAudioSession, closeAudioSession, type AudioSession } from "../../lib/audio/demodulator";
import { runAudioReceiver, type ReceiverState } from "../../lib/audio/handshake";
import { ProgressGrid, type ChunkState } from "../shared/ProgressGrid";
import { TransferSummary } from "../shared/TransferSummary";

const STATE_LABEL: Record<ReceiverState, string> = {
  beaconing: "Playing ready-beacon, waiting for a sender...",
  "awaiting-manifest": "Sender found — waiting for file info...",
  receiving: "Receiving audio...",
  "requesting-resend": "Requesting resend of missing chunks...",
  done: "Done",
  failed: "Failed",
};

export function AudioReceiverView({ accent }: { accent: string }) {
  const [state, setState] = useState<ReceiverState | "idle">("idle");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [chunkStates, setChunkStates] = useState<Map<number, ChunkState>>(new Map());
  const [result, setResult] = useState<{ status: "success" | "error"; url?: string; error?: string } | null>(null);
  const sessionRef = useRef<AudioSession | null>(null);

  useEffect(() => {
    return () => {
      if (sessionRef.current) closeAudioSession(sessionRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    setResult(null);
    setManifest(null);
    setChunkStates(new Map());

    const session = await createAudioSession();
    sessionRef.current = session;

    await runAudioReceiver(session, {
      onStateChange: setState,
      onManifest: setManifest,
      onChunkResult: (index, ok) => {
        setChunkStates((prev) => {
          const next = new Map(prev);
          next.set(index, ok ? "received" : "failed");
          return next;
        });
      },
      onFinished: (r) => {
        if (r.success && r.bytes && r.manifest) {
          const blob = new Blob([new Uint8Array(r.bytes)], { type: r.manifest.mimeType });
          setResult({ status: "success", url: URL.createObjectURL(blob) });
        } else {
          setResult({ status: "error", error: r.error ?? "Transfer failed." });
        }
      },
    });
  }, []);

  const reset = useCallback(() => {
    if (sessionRef.current) {
      closeAudioSession(sessionRef.current);
      sessionRef.current = null;
    }
    setState("idle");
    setManifest(null);
    setChunkStates(new Map());
    setResult(null);
  }, []);

  const states: ChunkState[] = useMemo(() => {
    if (!manifest) return [];
    return Array.from({ length: manifest.chunkCount }, (_, i) => chunkStates.get(i) ?? "pending");
  }, [manifest, chunkStates]);

  if (result) {
    return (
      <TransferSummary
        status={result.status}
        fileName={manifest?.fileName}
        fileSize={manifest?.fileSize}
        mimeType={manifest?.mimeType}
        errorMessage={result.error}
        downloadUrl={result.url}
        onReset={reset}
        accent={accent}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
        <Info className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">How it works:</span>{" "}
          Click Start Listening before the sender starts. This device plays a ready-beacon until the sender
          acknowledges, then listens for the file over audio.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300 leading-relaxed">
          Needs a quiet room and both devices' mic/speaker at reasonable volume, ~15–60cm apart. Keep this
          tab in the foreground for the whole transfer — backgrounding it pauses detection.
        </p>
      </div>

      {state === "idle" && (
        <button
          onClick={start}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.01] active:scale-95"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent})` }}
        >
          <Mic className="w-4 h-4" />
          Start Listening
        </button>
      )}

      {state !== "idle" && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 rounded-3xl border border-border bg-card/40">
            <div className="relative shrink-0">
              <Mic className="w-8 h-8" style={{ color: accent }} />
              {state !== "done" && state !== "failed" && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ background: accent }}
                />
              )}
            </div>
            <p className="text-sm font-semibold">{STATE_LABEL[state]}</p>
          </div>

          {manifest && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-border bg-card/40">
                <p className="font-mono text-sm break-all">{manifest.fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {manifest.chunkCount} chunks · {manifest.mimeType}
                </p>
              </div>
              <ProgressGrid chunkCount={manifest.chunkCount} states={states} accent={accent} />
            </div>
          )}

          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
