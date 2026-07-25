import type { FamilyTree, Member } from '../types';

function stripPhotos(tree: FamilyTree): FamilyTree {
  return {
    ...tree,
    members: tree.members.map((m: Member) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { photo: _, ...rest } = m;
      return rest;
    }),
  };
}

async function compress(data: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') {
    return btoa(unescape(encodeURIComponent(data)));
  }
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const compressed = await new Response(cs.readable).arrayBuffer();
  const uint8 = new Uint8Array(compressed);
  let binary = '';
  uint8.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function decompress(b64: string): Promise<string> {
  try {
    const binary = atob(b64);
    if (typeof DecompressionStream === 'undefined') {
      return decodeURIComponent(escape(binary));
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const decompressed = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch {
    // fallback: treat as plain base64 UTF-8 string
    return decodeURIComponent(escape(atob(b64)));
  }
}

export async function encodeShareHash(tree: FamilyTree): Promise<string> {
  const stripped = stripPhotos(tree);
  const json = JSON.stringify(stripped);
  const b64 = await compress(json);
  return b64;
}

export async function decodeShareHash(hash: string): Promise<FamilyTree | null> {
  try {
    const clean = hash.startsWith('#') ? hash.slice(1) : hash;
    const json = await decompress(clean);
    const parsed = JSON.parse(json) as FamilyTree;
    if (!parsed.id || !parsed.name || !Array.isArray(parsed.members)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function exportTreeAsJSON(tree: FamilyTree): void {
  const json = JSON.stringify(tree, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const safeName = tree.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importTreeFromJSON(file: File): Promise<FamilyTree | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as FamilyTree;
        if (!parsed.id || !parsed.name || !Array.isArray(parsed.members)) {
          resolve(null);
          return;
        }
        resolve(parsed);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
