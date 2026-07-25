"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Upload, Play, Pause, RefreshCw, Info, FileText, Maximize, Minimize, X } from "lucide-react";
import {
  buildManifestAndChunks,
  encodeManifestFrame,
  encodeChunkFrame,
  type Manifest,
} from "../../lib/chunking";
import { bundleFiles } from "../../lib/zipBundle";
import {
  QR_CHUNK_PAYLOAD_DEFAULT,
  QR_CHUNK_PAYLOAD_MIN,
  QR_CHUNK_PAYLOAD_MAX,
  QR_CHUNK_PAYLOAD_STEP,
  QR_CHUNK_PAYLOAD_RECOMMENDED_MAX,
  QR_CHUNK_PAYLOAD_PRESETS,
  QR_EC_LEVEL,
  QR_DEFAULT_INTERVAL_MS,
  QR_MIN_INTERVAL_MS,
  QR_MAX_INTERVAL_MS,
  QR_ANNOUNCE_REPEATS,
  QR_ANNOUNCE_DWELL_MS,
  buildQrCycle,
  dwellMsFor,
  bytesToBase64,
  type QrCycleEntry,
} from "../../lib/qr/qrFraming";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const NORMAL_QR_SIZE = 260;

type Phase = "announcing" | "cycling";

export function QrSenderView({ accent }: { accent: string }) {
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [bundling, setBundling] = useState(false);
  const [chunkSize, setChunkSize] = useState(QR_CHUNK_PAYLOAD_DEFAULT);

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [manifestValue, setManifestValue] = useState("");
  const [chunkValues, setChunkValues] = useState<string[]>([]);
  const [cycle, setCycle] = useState<QrCycleEntry[]>([]);
  const [intervalMs, setIntervalMs] = useState(QR_DEFAULT_INTERVAL_MS);
  const [idx, setIdx] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [phase, setPhase] = useState<Phase>("announcing");
  const [announceRepeatIndex, setAnnounceRepeatIndex] = useState(0);
  const [showTransitionFlash, setShowTransitionFlash] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrPixelSize, setQrPixelSize] = useState(NORMAL_QR_SIZE);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (isFullscreen) {
        setQrPixelSize(Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.85));
      } else {
        setQrPixelSize(NORMAL_QR_SIZE);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const startTransfer = useCallback(async () => {
    if (!pendingFiles || pendingFiles.length === 0) return;
    setBundling(true);
    try {
      const file = await bundleFiles(pendingFiles);
      const { manifest: m, chunks } = await buildManifestAndChunks(file, chunkSize);
      setManifest(m);
      setManifestValue(bytesToBase64(encodeManifestFrame(m)));
      setChunkValues(chunks.map((c) => bytesToBase64(encodeChunkFrame(c.transferId, c.chunkIndex, c.payload))));
      setCycle(buildQrCycle(m.chunkCount));
      setIdx(0);
      setLoopCount(0);
      setPhase("announcing");
      setAnnounceRepeatIndex(0);
      setShowTransitionFlash(false);
      setPlaying(true);
    } finally {
      setBundling(false);
    }
  }, [pendingFiles, chunkSize]);

  const resetAll = useCallback(() => {
    setPendingFiles(null);
    setManifest(null);
    setChunkValues([]);
    setCycle([]);
    setPlaying(false);
    setPhase("announcing");
    setAnnounceRepeatIndex(0);
    setShowTransitionFlash(false);
  }, []);

  // Single timer drives both phases: while announcing, cycle only the
  // manifest QR a fixed number of times so the receiver's camera — with zero
  // prior focus on its first frame of the session — gets a clean window to
  // read it before dense chunk data starts. Once cycling, behaves as before.
  useEffect(() => {
    if (!playing || !manifest) return;

    if (phase === "announcing") {
      const timer = setTimeout(() => {
        const next = announceRepeatIndex + 1;
        if (next >= QR_ANNOUNCE_REPEATS) {
          setPhase("cycling");
          setIdx(0);
          setLoopCount(0);
          setAnnounceRepeatIndex(0);
          setShowTransitionFlash(true);
        } else {
          setAnnounceRepeatIndex(next);
        }
      }, QR_ANNOUNCE_DWELL_MS);
      return () => clearTimeout(timer);
    }

    if (cycle.length === 0) return;
    const entry = cycle[idx];
    const dwell = dwellMsFor(entry, intervalMs);
    const timer = setTimeout(() => {
      setIdx((prev) => {
        const next = (prev + 1) % cycle.length;
        if (next === 0) setLoopCount((c) => c + 1);
        return next;
      });
    }, dwell);
    return () => clearTimeout(timer);
  }, [playing, phase, announceRepeatIndex, idx, intervalMs, cycle, manifest]);

  useEffect(() => {
    if (!showTransitionFlash) return;
    const t = setTimeout(() => setShowTransitionFlash(false), 1500);
    return () => clearTimeout(t);
  }, [showTransitionFlash]);

  const currentValue = useMemo(() => {
    if (!manifest) return "";
    if (phase === "announcing") return manifestValue;
    if (cycle.length === 0) return "";
    const entry = cycle[idx];
    return entry.kind === "manifest" ? manifestValue : chunkValues[entry.index] ?? "";
  }, [manifest, phase, cycle, idx, manifestValue, chunkValues]);

  const estimatedSeconds = manifest ? Math.round((manifest.chunkCount * intervalMs) / 1000) : 0;
  const throughputBps = Math.round((chunkSize * 1000) / intervalMs);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
        <Info className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">How it works:</span>{" "}
          Pick one or more files, then click Start. The QR below first announces the file info, then cycles
          through your file&apos;s data — go fullscreen for a bigger, denser code the receiver&apos;s camera
          can read more data from per frame.
        </p>
      </div>

      {!pendingFiles && !manifest && (
        <label className="flex flex-col items-center justify-center gap-3 py-16 rounded-3xl border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer bg-card/20">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Click to choose one or more files</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) setPendingFiles(files);
            }}
          />
        </label>
      )}

      {pendingFiles && !manifest && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} selected</p>
              <button onClick={() => setPendingFiles(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono truncate mr-2">{f.name}</span>
                  <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
            {pendingFiles.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Multiple files are zipped into one archive before transfer.
              </p>
            )}
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>QR data size per frame</span>
              <span className="font-mono text-foreground">{chunkSize} bytes</span>
            </div>
            <input
              type="range"
              min={QR_CHUNK_PAYLOAD_MIN}
              max={QR_CHUNK_PAYLOAD_MAX}
              step={QR_CHUNK_PAYLOAD_STEP}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full accent-current"
              style={{ color: accent }}
            />
            <div className="flex flex-wrap gap-2">
              {QR_CHUNK_PAYLOAD_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setChunkSize(p)}
                  className="px-2.5 py-1 rounded-lg text-xs border transition-all"
                  style={
                    chunkSize === p
                      ? { borderColor: accent, color: accent, background: `${accent}15` }
                      : { borderColor: "hsl(var(--border))" }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
            {chunkSize > QR_CHUNK_PAYLOAD_RECOMMENDED_MAX && (
              <p className="text-xs text-amber-400 leading-relaxed">
                Above {QR_CHUNK_PAYLOAD_RECOMMENDED_MAX} bytes the QR gets dense — use fullscreen and a
                steady, high-resolution camera for reliable scans.
              </p>
            )}
          </div>

          <button
            onClick={startTransfer}
            disabled={bundling}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent})` }}
          >
            <Play className="w-4 h-4" />
            {bundling ? "Preparing..." : "Start Transfer"}
          </button>
        </div>
      )}

      {manifest && (
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <div
            ref={containerRef}
            className={
              isFullscreen
                ? "flex flex-col items-center justify-center gap-6 w-screen h-screen bg-black"
                : "flex flex-col items-center gap-4 flex-shrink-0 w-full lg:w-auto"
            }
          >
            <div className="p-5 bg-white rounded-3xl shadow-2xl">
              {currentValue ? (
                <QRCodeSVG value={currentValue} size={qrPixelSize} level={QR_EC_LEVEL} bgColor="#ffffff" fgColor="#0f172a" />
              ) : (
                <div style={{ width: qrPixelSize, height: qrPixelSize }} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
              >
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {playing ? "Pause" : "Resume"}
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
              >
                {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
              {!isFullscreen && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  New File
                </button>
              )}
            </div>

            {phase === "announcing" ? (
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  Announcing file info
                </span>
                <p
                  className="text-xs text-muted-foreground"
                  style={isFullscreen ? { color: "rgba(255,255,255,0.7)" } : undefined}
                >
                  Point receiver&apos;s camera here ({announceRepeatIndex + 1}/{QR_ANNOUNCE_REPEATS})
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                {showTransitionFlash && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400">
                    Now sending file data
                  </span>
                )}
                <p
                  className="text-xs text-muted-foreground"
                  style={isFullscreen ? { color: "rgba(255,255,255,0.7)" } : undefined}
                >
                  Loop {loopCount + 1} · frame {idx + 1}/{cycle.length}
                </p>
              </div>
            )}
          </div>

          {!isFullscreen && (
            <div className="flex-1 space-y-5 w-full">
              <div className="p-5 rounded-3xl border border-border bg-card/40 backdrop-blur-xl space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: accent }} />
                  <p className="font-mono text-sm break-all">{manifest.fileName}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(manifest.fileSize)} · {manifest.chunkCount} chunks of {manifest.chunkSize}B ·{" "}
                  {manifest.mimeType}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cycle interval</span>
                  <span>{intervalMs}ms</span>
                </div>
                <input
                  type="range"
                  min={QR_MIN_INTERVAL_MS}
                  max={QR_MAX_INTERVAL_MS}
                  step={10}
                  value={intervalMs}
                  onChange={(e) => setIntervalMs(Number(e.target.value))}
                  className="w-full accent-current"
                  style={{ color: accent }}
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                ~{throughputBps} bytes/sec effective · one full loop ≈ {estimatedSeconds}s. Slower cameras may
                need multiple loops to catch every chunk — that&apos;s expected.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
