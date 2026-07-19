// Wraps the shared raw frame bytes (from lib/chunking.ts) into an audio
// symbol stream: [sync tone][nibble stream, 2 nibbles/byte][End-of-Frame tone].
// Manifest frames open with Manifest-Sync, chunk frames with Chunk-Sync, so
// frame type is implicit in which sync tone opened it — no extra type byte
// needed in the nibble stream itself.

import { SYNC_MANIFEST_HZ, SYNC_CHUNK_HZ, SYNC_RESEND_REQUEST_HZ, END_OF_FRAME_HZ } from "./toneMap";
import type { EncodedSymbol } from "./modulator";
import type { ToneEvent } from "./demodulator";

// Smaller than QR's chunk size: per-chunk framing overhead (sync + end tones +
// a 14-byte header, all nibble-encoded) still matters at this bitrate, so
// keeping chunks reasonably sized keeps the payload-to-overhead ratio sane
// while still giving fine-grained resend-by-index granularity. Bumped up from
// an initial 32 bytes — at 96 bytes the fixed 14-byte header is a much smaller
// fraction of each chunk frame, meaningfully raising effective throughput.
export const AUDIO_CHUNK_PAYLOAD_SIZE = 96;

function bytesToNibbleSymbols(bytes: Uint8Array): EncodedSymbol[] {
  const symbols: EncodedSymbol[] = [];
  for (const byte of bytes) {
    symbols.push({ kind: "nibble", value: (byte >> 4) & 0xf });
    symbols.push({ kind: "nibble", value: byte & 0xf });
  }
  return symbols;
}

function nibblesToBytes(nibbles: number[]): Uint8Array {
  const byteCount = Math.floor(nibbles.length / 2);
  const out = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    out[i] = ((nibbles[i * 2] & 0xf) << 4) | (nibbles[i * 2 + 1] & 0xf);
  }
  return out;
}

export function encodeManifestSymbols(rawManifestBytes: Uint8Array): EncodedSymbol[] {
  return [
    { kind: "tone", freq: SYNC_MANIFEST_HZ },
    ...bytesToNibbleSymbols(rawManifestBytes),
    { kind: "tone", freq: END_OF_FRAME_HZ },
  ];
}

export function encodeChunkSymbols(rawChunkBytes: Uint8Array): EncodedSymbol[] {
  return [
    { kind: "tone", freq: SYNC_CHUNK_HZ },
    ...bytesToNibbleSymbols(rawChunkBytes),
    { kind: "tone", freq: END_OF_FRAME_HZ },
  ];
}

// Resend request payload: a flat list of missing chunk indices, 2 bytes (BE) each.
export function encodeResendIndices(indices: number[]): Uint8Array {
  const out = new Uint8Array(indices.length * 2);
  const view = new DataView(out.buffer);
  indices.forEach((idx, i) => view.setUint16(i * 2, idx, false));
  return out;
}

export function decodeResendIndices(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const indices: number[] = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) indices.push(view.getUint16(i, false));
  return indices;
}

export function encodeResendSymbols(indices: number[]): EncodedSymbol[] {
  return [
    { kind: "tone", freq: SYNC_RESEND_REQUEST_HZ },
    ...bytesToNibbleSymbols(encodeResendIndices(indices)),
    { kind: "tone", freq: END_OF_FRAME_HZ },
  ];
}

export type DecodedFrame =
  | { kind: "manifest"; bytes: Uint8Array }
  | { kind: "chunk"; bytes: Uint8Array }
  | { kind: "resend"; bytes: Uint8Array };

// Stateful decoder consuming the ToneDetector's event stream. Any tone/nibble
// events unrelated to frame content (handshake beacons, End-of-Transmission)
// simply pass through untouched — the caller handles those directly.
export class FrameDecoder {
  private collecting = false;
  private kind: "manifest" | "chunk" | "resend" | null = null;
  private nibbles: number[] = [];

  handleEvent(event: ToneEvent): DecodedFrame | null {
    if (event.type === "control") {
      if (event.freq === SYNC_MANIFEST_HZ) {
        this.collecting = true;
        this.kind = "manifest";
        this.nibbles = [];
        return null;
      }
      if (event.freq === SYNC_CHUNK_HZ) {
        this.collecting = true;
        this.kind = "chunk";
        this.nibbles = [];
        return null;
      }
      if (event.freq === SYNC_RESEND_REQUEST_HZ) {
        this.collecting = true;
        this.kind = "resend";
        this.nibbles = [];
        return null;
      }
      if (event.freq === END_OF_FRAME_HZ && this.collecting && this.kind) {
        const bytes = nibblesToBytes(this.nibbles);
        const kind = this.kind;
        this.collecting = false;
        this.kind = null;
        this.nibbles = [];
        return { kind, bytes } as DecodedFrame;
      }
      return null;
    }
    if (event.type === "nibble" && this.collecting) {
      this.nibbles.push(event.value);
    }
    return null;
  }
}
