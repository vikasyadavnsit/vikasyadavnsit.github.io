// Whole-file integrity check. Truncated to 8 bytes — enough to catch accidental
// corruption in a demo transport, not intended as a security primitive.

export async function sha256Truncated8(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return new Uint8Array(digest).slice(0, 8);
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
