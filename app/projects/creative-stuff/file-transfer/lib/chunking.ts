// Shared, transport-agnostic frame model. Both the QR transport (base64 over a
// QR string) and the audio transport (nibble stream over tones) serialize these
// exact same raw byte frames — only the "how do these bytes travel" layer differs.

import { crc32 } from "./crc32";
import { sha256Truncated8, bytesEqual } from "./hash";

export const MAGIC = 0xf7;
export const FRAME_MANIFEST = 0x00;
export const FRAME_CHUNK = 0x01;

const MAX_MIME_LEN = 48;
const MAX_NAME_LEN = 64;

export interface Manifest {
  transferId: Uint8Array; // 4 bytes
  fileSize: number;
  chunkCount: number;
  chunkSize: number;
  mimeType: string;
  fileName: string;
  fileChecksum: Uint8Array; // 8 bytes
}

export interface ChunkFrame {
  transferId: Uint8Array;
  chunkIndex: number;
  payload: Uint8Array;
}

export interface DecodedChunkFrame extends ChunkFrame {
  crcValid: boolean;
}

export function randomTransferId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(4));
}

function truncateUtf8(str: string, maxBytes: number): Uint8Array {
  let bytes = new TextEncoder().encode(str);
  while (bytes.byteLength > maxBytes) {
    // Trim one char at a time to avoid splitting a multi-byte codepoint.
    str = str.slice(0, -1);
    bytes = new TextEncoder().encode(str);
  }
  return bytes;
}

// ─── Manifest frame ───────────────────────────────────────────────────────────
// [magic][frameType][transferId x4][fileSize u32][chunkCount u16][chunkSize u16]
// [mimeLen u8][mime bytes][nameLen u8][name bytes][fileChecksum x8]

export function encodeManifestFrame(m: Manifest): Uint8Array {
  const mimeBytes = truncateUtf8(m.mimeType, MAX_MIME_LEN);
  const nameBytes = truncateUtf8(m.fileName, MAX_NAME_LEN);
  const size = 1 + 1 + 4 + 4 + 2 + 2 + 1 + mimeBytes.length + 1 + nameBytes.length + 8;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let off = 0;
  out[off++] = MAGIC;
  out[off++] = FRAME_MANIFEST;
  out.set(m.transferId, off); off += 4;
  view.setUint32(off, m.fileSize, false); off += 4;
  view.setUint16(off, m.chunkCount, false); off += 2;
  view.setUint16(off, m.chunkSize, false); off += 2;
  out[off++] = mimeBytes.length;
  out.set(mimeBytes, off); off += mimeBytes.length;
  out[off++] = nameBytes.length;
  out.set(nameBytes, off); off += nameBytes.length;
  out.set(m.fileChecksum, off); off += 8;
  return out;
}

export function decodeManifestFrame(bytes: Uint8Array): Manifest | null {
  if (bytes.length < 2 || bytes[0] !== MAGIC || bytes[1] !== FRAME_MANIFEST) return null;
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 2;
    const transferId = bytes.slice(off, off + 4); off += 4;
    const fileSize = view.getUint32(off, false); off += 4;
    const chunkCount = view.getUint16(off, false); off += 2;
    const chunkSize = view.getUint16(off, false); off += 2;
    const mimeLen = bytes[off++];
    const mimeType = new TextDecoder().decode(bytes.slice(off, off + mimeLen)); off += mimeLen;
    const nameLen = bytes[off++];
    const fileName = new TextDecoder().decode(bytes.slice(off, off + nameLen)); off += nameLen;
    const fileChecksum = bytes.slice(off, off + 8); off += 8;
    return { transferId, fileSize, chunkCount, chunkSize, mimeType, fileName, fileChecksum };
  } catch {
    return null;
  }
}

// ─── Chunk frame ──────────────────────────────────────────────────────────────
// [magic][frameType][transferId x4][chunkIndex u16][payloadLen u16][crc32 u32][payload]

export function encodeChunkFrame(transferId: Uint8Array, chunkIndex: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(1 + 1 + 4 + 2 + 2 + 4 + payload.length);
  const view = new DataView(out.buffer);
  let off = 0;
  out[off++] = MAGIC;
  out[off++] = FRAME_CHUNK;
  out.set(transferId, off); off += 4;
  view.setUint16(off, chunkIndex, false); off += 2;
  view.setUint16(off, payload.length, false); off += 2;
  view.setUint32(off, crc32(payload), false); off += 4;
  out.set(payload, off);
  return out;
}

export function decodeChunkFrame(bytes: Uint8Array): DecodedChunkFrame | null {
  if (bytes.length < 14 || bytes[0] !== MAGIC || bytes[1] !== FRAME_CHUNK) return null;
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 2;
    const transferId = bytes.slice(off, off + 4); off += 4;
    const chunkIndex = view.getUint16(off, false); off += 2;
    const payloadLen = view.getUint16(off, false); off += 2;
    const expectedCrc = view.getUint32(off, false); off += 4;
    const payload = bytes.slice(off, off + payloadLen);
    if (payload.length !== payloadLen) return null;
    const crcValid = crc32(payload) === expectedCrc;
    return { transferId, chunkIndex, payload, crcValid };
  } catch {
    return null;
  }
}

// ─── Build / reassemble ───────────────────────────────────────────────────────

export async function buildManifestAndChunks(
  file: File,
  chunkSize: number,
): Promise<{ manifest: Manifest; chunks: ChunkFrame[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const transferId = randomTransferId();
  const chunkCount = Math.max(1, Math.ceil(bytes.length / chunkSize));
  const chunks: ChunkFrame[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkSize;
    const payload = bytes.slice(start, Math.min(start + chunkSize, bytes.length));
    chunks.push({ transferId, chunkIndex: i, payload });
  }
  const fileChecksum = await sha256Truncated8(bytes);
  const manifest: Manifest = {
    transferId,
    fileSize: bytes.length,
    chunkCount,
    chunkSize,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name || "download.bin",
    fileChecksum,
  };
  return { manifest, chunks };
}

export class ReassemblyError extends Error {}

export async function reassemble(manifest: Manifest, chunkMap: Map<number, Uint8Array>): Promise<Uint8Array> {
  if (chunkMap.size < manifest.chunkCount) {
    throw new ReassemblyError(`Missing ${manifest.chunkCount - chunkMap.size} of ${manifest.chunkCount} chunks.`);
  }
  const out = new Uint8Array(manifest.fileSize);
  let off = 0;
  for (let i = 0; i < manifest.chunkCount; i++) {
    const part = chunkMap.get(i);
    if (!part) throw new ReassemblyError(`Missing chunk ${i}.`);
    out.set(part, off);
    off += part.length;
  }
  const checksum = await sha256Truncated8(out);
  if (!bytesEqual(checksum, manifest.fileChecksum)) {
    throw new ReassemblyError("Whole-file checksum mismatch — reassembly failed.");
  }
  return out;
}
