"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, AlertCircle, RefreshCw, ScanLine, Camera } from "lucide-react";
import { useQrScanner } from "../../lib/qr/useQrScanner";
import { base64ToBytes } from "../../lib/qr/qrFraming";
import {
  decodeManifestFrame,
  decodeChunkFrame,
  reassemble,
  ReassemblyError,
  type Manifest,
} from "../../lib/chunking";
import { ProgressGrid, type ChunkState } from "../shared/ProgressGrid";
import { TransferSummary } from "../shared/TransferSummary";

function bytesEq4(a: Uint8Array, b: Uint8Array): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function QrReceiverView({ accent }: { accent: string }) {
  const [started, setStarted] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const chunkMapRef = useRef<Map<number, Uint8Array>>(new Map());
  const failedRef = useRef<Set<number>>(new Set());
  const [receivedCount, setReceivedCount] = useState(0);
  const [scansSeen, setScansSeen] = useState(0);
  const [result, setResult] = useState<{ status: "success" | "error"; url?: string; error?: string } | null>(null);
  const finalizingRef = useRef(false);

  const reset = useCallback(() => {
    setManifest(null);
    chunkMapRef.current = new Map();
    failedRef.current = new Set();
    setReceivedCount(0);
    setScansSeen(0);
    setResult(null);
    finalizingRef.current = false;
  }, []);

  const handleDecode = useCallback(
    (text: string) => {
      if (result) return; // already finished
      const bytes = base64ToBytes(text);
      if (!bytes) return;

      const asManifest = decodeManifestFrame(bytes);
      if (asManifest) {
        setManifest((prev) => {
          if (prev && bytesEq4(prev.transferId, asManifest.transferId)) return prev;
          chunkMapRef.current = new Map();
          failedRef.current = new Set();
          setReceivedCount(0);
          setScansSeen(0);
          return asManifest;
        });
        return;
      }

      const asChunk = decodeChunkFrame(bytes);
      if (asChunk) {
        setManifest((currentManifest) => {
          if (!currentManifest || !bytesEq4(currentManifest.transferId, asChunk.transferId)) return currentManifest;
          setScansSeen((s) => s + 1); // counts replays/duplicates too, not just new chunks
          if (chunkMapRef.current.has(asChunk.chunkIndex)) return currentManifest;
          if (asChunk.crcValid) {
            chunkMapRef.current.set(asChunk.chunkIndex, asChunk.payload);
            setReceivedCount(chunkMapRef.current.size);
          } else {
            failedRef.current.add(asChunk.chunkIndex);
          }
          return currentManifest;
        });
      }
    },
    [result],
  );

  const { videoRef, canvasRef, error, status } = useQrScanner({ active: started && !result, onDecode: handleDecode });

  // Finalize once every chunk is in.
  useEffect(() => {
    if (!manifest || result || finalizingRef.current) return;
    if (chunkMapRef.current.size < manifest.chunkCount) return;
    finalizingRef.current = true;
    (async () => {
      try {
        const bytes = await reassemble(manifest, chunkMapRef.current);
        const blob = new Blob([new Uint8Array(bytes)], { type: manifest.mimeType });
        setResult({ status: "success", url: URL.createObjectURL(blob) });
      } catch (e) {
        setResult({ status: "error", error: e instanceof ReassemblyError ? e.message : "Reassembly failed." });
      }
    })();
  }, [manifest, receivedCount, result]);

  const states: ChunkState[] = useMemo(() => {
    if (!manifest) return [];
    return Array.from({ length: manifest.chunkCount }, (_, i) =>
      chunkMapRef.current.has(i) ? "received" : failedRef.current.has(i) ? "failed" : "pending",
    );
  }, [manifest, receivedCount]);

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
          Point this camera at the sender&apos;s screen. Chunks arrive out of order and repeat as the sender
          loops — this view just fills in whatever&apos;s missing.
        </p>
      </div>

      {!started && (
        <button
          onClick={() => setStarted(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-[1.01] active:scale-95"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent})` }}
        >
          <Camera className="w-4 h-4" />
          Start Scanning
        </button>
      )}

      {started && (
        <div
          className="relative rounded-3xl overflow-hidden bg-black border border-border"
          style={{ aspectRatio: "16/9", maxHeight: "420px" }}
        >
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 relative">
                {[
                  ["top-0 left-0", "border-t-2 border-l-2"],
                  ["top-0 right-0", "border-t-2 border-r-2"],
                  ["bottom-0 left-0", "border-b-2 border-l-2"],
                  ["bottom-0 right-0", "border-b-2 border-r-2"],
                ].map(([pos, border]) => (
                  <div key={pos} className={`absolute w-8 h-8 rounded-sm ${pos} ${border}`} style={{ borderColor: accent }} />
                ))}
              </div>
            </div>
          )}

          {!manifest && status === "scanning" && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 text-xs text-white/80">
              <ScanLine className="w-3.5 h-3.5" />
              Waiting for manifest frame...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {manifest && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-border bg-card/40">
            <p className="font-mono text-sm break-all">{manifest.fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {manifest.chunkCount} chunks · {manifest.mimeType}
            </p>
          </div>
          <ProgressGrid chunkCount={manifest.chunkCount} states={states} accent={accent} />
          <p className="text-xs text-muted-foreground">
            {scansSeen} frame{scansSeen === 1 ? "" : "s"} scanned · {receivedCount}/{manifest.chunkCount} unique
            chunks{scansSeen > receivedCount && " — duplicates are being skipped automatically"}
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card/60 hover:bg-card transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
