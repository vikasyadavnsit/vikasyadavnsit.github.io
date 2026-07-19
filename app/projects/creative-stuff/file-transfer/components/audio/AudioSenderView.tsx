"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, Info, AlertTriangle, Radio, FileText, X } from "lucide-react";
import { buildManifestAndChunks, type Manifest } from "../../lib/chunking";
import { bundleFiles } from "../../lib/zipBundle";
import { AUDIO_CHUNK_PAYLOAD_SIZE } from "../../lib/audio/audioFraming";
import { SYMBOL_ON_MS, SYMBOL_GAP_MS } from "../../lib/audio/toneMap";
import { createAudioSession, closeAudioSession, type AudioSession } from "../../lib/audio/demodulator";
import { runAudioSender, type SenderState } from "../../lib/audio/handshake";

const STATE_LABEL: Record<SenderState, string> = {
  "listening-for-receiver": "Listening for a receiver's ready beacon...",
  handshaking: "Receiver found — acknowledging...",
  "sending-manifest": "Sending file info...",
  "sending-chunks": "Transmitting audio...",
  "awaiting-resend": "Listening for a resend request...",
  resending: "Re-transmitting missing chunks...",
  done: "Done",
  failed: "Failed",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function AudioSenderView({ accent }: { accent: string }) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [bundling, setBundling] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [state, setState] = useState<SenderState | "idle">("idle");
  const [sent, setSent] = useState(0);
  const [outcome, setOutcome] = useState<"no-response" | "clean" | "gave-up-after-resends" | null>(null);
  const sessionRef = useRef<AudioSession | null>(null);

  useEffect(() => {
    return () => {
      if (sessionRef.current) closeAudioSession(sessionRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    if (!files || files.length === 0) return;
    setOutcome(null);
    setSent(0);
    setBundling(true);
    let m: Manifest;
    let chunks: Awaited<ReturnType<typeof buildManifestAndChunks>>["chunks"];
    try {
      const bundled = await bundleFiles(files);
      ({ manifest: m, chunks } = await buildManifestAndChunks(bundled, AUDIO_CHUNK_PAYLOAD_SIZE));
    } finally {
      setBundling(false);
    }
    setManifest(m);

    const session = await createAudioSession();
    sessionRef.current = session;

    await runAudioSender(session, m, chunks, {
      onStateChange: setState,
      onChunkSent: (i) => setSent(i + 1),
      onFinished: (o) => setOutcome(o),
    });
  }, [files]);

  const reset = useCallback(() => {
    if (sessionRef.current) {
      closeAudioSession(sessionRef.current);
      sessionRef.current = null;
    }
    setFiles(null);
    setManifest(null);
    setState("idle");
    setSent(0);
    setOutcome(null);
  }, []);

  const estimatedSeconds = useMemo(() => {
    if (!manifest) return 0;
    const symbolSec = (SYMBOL_ON_MS + SYMBOL_GAP_MS) / 1000;
    // 2 nibbles/byte, ~14-byte header per chunk + 2 framing tones.
    const perChunk = ((14 + manifest.chunkSize) * 2 + 2) * symbolSec;
    return Math.round(manifest.chunkCount * perChunk);
  }, [manifest]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
        <Info className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">How it works:</span>{" "}
          Pick a file, then click Start. This device plays a ready-beacon back-and-forth with the receiver,
          then transmits your file as audio tones. Both devices need their speaker and microphone on.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300 leading-relaxed">
          This is a demonstration of acoustic modulation, not a practical transfer method — expect roughly
          4–5 bytes/sec. Use a quiet room, keep devices ~15–60cm apart, and keep both tabs in the foreground
          the whole time. Background noise, echo, or a backgrounded tab will likely break the transfer.
        </p>
      </div>

      {!files && !manifest && (
        <label className="flex flex-col items-center justify-center gap-3 py-16 rounded-3xl border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer bg-card/20">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Click to choose one or more small files (a KB or two total)</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (selected.length) setFiles(selected);
            }}
          />
        </label>
      )}

      {files && !manifest && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
              <button onClick={() => setFiles(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono truncate mr-2">{f.name}</span>
                  <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
            {files.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Multiple files are zipped into one archive before transmission.
              </p>
            )}
          </div>
          <button
            onClick={start}
            disabled={bundling}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent})` }}
          >
            <Radio className="w-4 h-4" />
            {bundling ? "Preparing..." : "Start Sending"}
          </button>
        </div>
      )}

      {manifest && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: accent }} />
              <p className="font-mono text-sm break-all">{manifest.fileName}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(manifest.fileSize)} · {manifest.chunkCount} chunks · est. ~{estimatedSeconds}s main pass
            </p>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-3xl border border-border bg-card/40">
            <div className="relative shrink-0">
              <Radio className="w-8 h-8" style={{ color: accent }} />
              {state !== "done" && state !== "failed" && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ background: accent }}
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{state === "idle" ? "Ready" : STATE_LABEL[state]}</p>
              {(state === "sending-chunks" || state === "resending") && (
                <p className="text-xs text-muted-foreground mt-1">
                  {sent} / {manifest.chunkCount} chunks sent
                </p>
              )}
            </div>
          </div>

          {outcome && (
            <div
              className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                outcome === "clean"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {outcome === "clean" &&
                "No resend request heard after finishing — the receiver likely got everything, but there's no way to be fully certain over a one-way check like this."}
              {outcome === "no-response" &&
                "No receiver ready-beacon was detected within 30 seconds. Make sure the receiver clicked Start Listening first."}
              {outcome === "gave-up-after-resends" &&
                "Gave up after repeated resend rounds — some chunks may not have made it. Check the receiver's progress."}
            </div>
          )}

          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
          >
            New Transfer
          </button>
        </div>
      )}
    </div>
  );
}
