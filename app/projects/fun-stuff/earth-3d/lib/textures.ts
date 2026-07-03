import * as THREE from 'three';

const P = new Uint8Array(512);
for (let i = 0; i < 256; i++) P[i] = P[i + 256] = ((i * 1664525 + 1013904223) >>> 0) & 0xff;

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t: number, a: number, b: number) { return a + t * (b - a); }

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = P[P[xi] + yi] / 255;
  const ba = P[P[(xi + 1) & 255] + yi] / 255;
  const ab = P[P[xi] + ((yi + 1) & 255)] / 255;
  const bb = P[P[(xi + 1) & 255] + ((yi + 1) & 255)] / 255;
  return lerp(v, lerp(u, aa, ba), lerp(u, ab, bb));
}

function fbm(x: number, y: number, octaves = 6): number {
  let value = 0, amplitude = 0.5, frequency = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / max;
}

export function generateEarthTexture(width = 2048, height = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const d = imageData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    const isPole = ny < 0.07 || ny > 0.93;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const n = fbm(nx * 4, ny * 2);
      const i = (y * width + x) * 4;
      let r, g, b;
      if (isPole || n > 0.90) {
        r = 240; g = 245; b = 255;
      } else if (n > 0.78) {
        const t = (n - 0.78) / 0.12;
        r = Math.round(lerp(t, 110, 180)); g = Math.round(lerp(t, 95, 150)); b = Math.round(lerp(t, 80, 140));
      } else if (n > 0.65) {
        const t = (n - 0.65) / 0.13;
        r = Math.round(lerp(t, 80, 110)); g = Math.round(lerp(t, 100, 95)); b = Math.round(lerp(t, 50, 80));
      } else if (n > 0.52) {
        const t = (n - 0.52) / 0.13;
        r = Math.round(lerp(t, 55, 80)); g = Math.round(lerp(t, 115, 100)); b = Math.round(lerp(t, 35, 50));
      } else if (n > 0.50) {
        r = 210; g = 190; b = 140;
      } else if (n > 0.38) {
        const t = (n - 0.38) / 0.12;
        r = Math.round(lerp(t, 15, 35)); g = Math.round(lerp(t, 55, 95)); b = Math.round(lerp(t, 130, 165));
      } else {
        const t = n / 0.38;
        r = Math.round(lerp(t, 5, 15)); g = Math.round(lerp(t, 30, 55)); b = Math.round(lerp(t, 100, 130));
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function generateSpecularMap(width = 2048, height = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const d = imageData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const n = fbm(nx * 4, ny * 2);
      const i = (y * width + x) * 4;
      const v = n < 0.52 ? 200 : 15;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

export function generateCloudTexture(width = 2048, height = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const d = imageData.data;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const n = fbm(nx * 3, ny * 1.5, 4);
      const i = (y * width + x) * 4;
      const alpha = Math.max(0, (n - 0.52) * 5);
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = Math.round(alpha * 220);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}
