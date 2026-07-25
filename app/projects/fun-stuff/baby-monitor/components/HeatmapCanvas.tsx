'use client';
import { useRef, useEffect } from 'react';
import type { TrackingPoint } from '../types';

interface HeatmapCanvasProps {
  points: TrackingPoint[];
  width?: number;
  height?: number;
}

export default function HeatmapCanvas({ points, width = 320, height = 180 }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (points.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No tracking data yet', width / 2, height / 2);
      return;
    }

    // Build density map
    const radius = Math.max(20, Math.min(width, height) * 0.08);

    for (const pt of points) {
      const px = pt.x * width;
      const py = pt.y * height;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0, 'rgba(255,80,0,0.06)');
      grad.addColorStop(0.4, 'rgba(255,200,0,0.03)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(Math.max(0, px - radius), Math.max(0, py - radius), radius * 2, radius * 2);
    }

    // Colorize: get pixel data and map brightness → hue
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3 / 255;
      if (brightness < 0.01) continue;

      // Map brightness to hue: low=blue(240) → mid=green(120) → high=red(0)
      const hue = Math.round((1 - Math.min(brightness * 8, 1)) * 240);
      const [nr, ng, nb] = hslToRgb(hue / 360, 1, 0.55);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
      data[i + 3] = Math.round(Math.min(brightness * 8, 1) * 220);
    }
    ctx.putImageData(imageData, 0, 0);
  }, [points, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-2xl border border-white/[0.06]"
      style={{ background: '#080810' }}
    />
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
