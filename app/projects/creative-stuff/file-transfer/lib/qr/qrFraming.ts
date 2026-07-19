// QR transport constants + the base64 wrapper around the shared raw frame bytes.
// Base64 is deliberately ASCII-only, so it round-trips cleanly through
// qrcode.react's string `value` and jsQR's decoded `data` string with no
// multi-byte-codepoint surprises.

// Raw bytes per chunk, pre-header/pre-base64. User-adjustable (see the slider
// bounds below) — larger than a minimal QR needs to stay scannable at typical
// size, but the sender view offers a fullscreen, much larger QR display, so a
// bigger, denser code stays reliably readable while carrying more data per
// frame.
export const QR_CHUNK_PAYLOAD_DEFAULT = 256;

// Slider bounds. Max is derived from the real QR capacity ceiling: byte-mode
// capacity at EC level M, version 40 (the largest standard version) is 2331
// bytes; base64 expands N raw bytes to ceil(N/3)*4 ASCII chars (1:1 with QR
// byte-mode capacity since base64 is pure ASCII), so the largest raw frame
// that still fits is 1746 bytes (ceil(1748/3)*4 = 2332 — one over — while
// ceil(1746/3)*4 = 2328 fits). Minus the 14-byte chunk header, max payload is
// ~1732 bytes at the absolute edge. 1536 leaves ~200 bytes of headroom so the
// slider can never produce a value the QR encoder rejects.
export const QR_CHUNK_PAYLOAD_MIN = 128;
export const QR_CHUNK_PAYLOAD_MAX = 1536;
export const QR_CHUNK_PAYLOAD_STEP = 32;
// Past this, scanning depends heavily on fullscreen + a steady, high-res
// camera (QR version climbs into the low-mid 30s, ~140-170 modules/side) —
// still safely within QR_CHUNK_PAYLOAD_MAX, just no longer a casual default.
export const QR_CHUNK_PAYLOAD_RECOMMENDED_MAX = 1024;
export const QR_CHUNK_PAYLOAD_PRESETS = [256, 320, 512, 1024];

export const QR_EC_LEVEL: "M" = "M";
export const QR_DEFAULT_INTERVAL_MS = 350;
export const QR_MIN_INTERVAL_MS = 200;
export const QR_MAX_INTERVAL_MS = 800;
export const QR_MANIFEST_DWELL_MS = 600;
export const QR_MANIFEST_REINSERT_EVERY = 12; // chunks, only once chunkCount > threshold
export const QR_MANIFEST_REINSERT_THRESHOLD = 50;

// One-time upfront phase before the sender starts the full interleaved cycle:
// show only the manifest QR, repeated, so the receiver's camera — with zero
// prior focus/lock on its very first frame of the session — has a clean,
// uncontested window to read the file info before dense chunk data starts
// flooding in. Deliberately longer than QR_MANIFEST_DWELL_MS (used for later
// in-loop reinsertions, where the camera is presumably already aimed).
export const QR_ANNOUNCE_REPEATS = 6;
export const QR_ANNOUNCE_DWELL_MS = 900;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export type QrCycleEntry = { kind: "manifest" } | { kind: "chunk"; index: number };

// Builds the sender's display order: manifest first, then every chunk in order,
// re-inserting the manifest periodically for large files so a receiver joining
// mid-loop doesn't have to wait for a full pass to learn chunkCount/chunkSize.
export function buildQrCycle(chunkCount: number): QrCycleEntry[] {
  const order: QrCycleEntry[] = [{ kind: "manifest" }];
  const reinsert = chunkCount > QR_MANIFEST_REINSERT_THRESHOLD;
  for (let i = 0; i < chunkCount; i++) {
    order.push({ kind: "chunk", index: i });
    const isLast = i === chunkCount - 1;
    if (reinsert && !isLast && (i + 1) % QR_MANIFEST_REINSERT_EVERY === 0) {
      order.push({ kind: "manifest" });
    }
  }
  return order;
}

export function dwellMsFor(entry: QrCycleEntry, chunkIntervalMs: number): number {
  return entry.kind === "manifest" ? QR_MANIFEST_DWELL_MS : chunkIntervalMs;
}
