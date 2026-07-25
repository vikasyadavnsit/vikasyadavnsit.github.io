'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import { Camera, Upload, WifiOff, Pencil, PencilOff } from 'lucide-react';
import type { BoundingBox, Zone, PoseLandmark, BabyState } from '../types';

const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
  SAFE: { fill: 'rgba(34,197,94,0.15)', stroke: 'rgba(34,197,94,0.8)' },
  WARNING: { fill: 'rgba(245,158,11,0.15)', stroke: 'rgba(245,158,11,0.8)' },
  RESTRICTED: { fill: 'rgba(239,68,68,0.25)', stroke: 'rgba(239,68,68,0.8)' },
};

const ZONE_TYPE_COLORS: Record<Zone['type'], string> = {
  SAFE: 'bg-green-500/20 border-green-500/60 text-green-300',
  WARNING: 'bg-amber-500/20 border-amber-500/60 text-amber-300',
  RESTRICTED: 'bg-red-500/20 border-red-500/60 text-red-300',
};

const STATE_COLORS: Record<BabyState, string> = {
  sleeping: '#60a5fa',
  active: '#34d399',
  restless: '#fbbf24',
  not_visible: '#6b7280',
};

interface MonitorViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMonitoring: boolean;
  boundingBox: BoundingBox | null;
  poseLandmarks: PoseLandmark[] | null;
  babyState: BabyState;
  zones: Zone[];
  isEditingZones: boolean;
  onToggleZoneEdit: () => void;
  onZoneDrawn: (zone: Omit<Zone, 'id'>) => void;
  onDeleteZone: (id: string) => void;
  onStartCamera: () => void;
  onUploadVideo: (file: File) => void;
  cameraError: string | null;
  videoMode: 'camera' | 'upload';
}

export default function MonitorView({
  videoRef,
  isMonitoring,
  boundingBox,
  poseLandmarks,
  babyState,
  zones,
  isEditingZones,
  onToggleZoneEdit,
  onZoneDrawn,
  onDeleteZone,
  onStartCamera,
  onUploadVideo,
  cameraError,
  videoMode,
}: MonitorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zone drawing state
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pendingZone, setPendingZone] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedZoneType, setSelectedZoneType] = useState<Zone['type']>('SAFE');

  // Draw overlay on canvas — runs on every render to stay in sync with detection results
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to the displayed dimensions (normalized coords work at any canvas size)
    const cw = canvas.offsetWidth || 640;
    const ch = canvas.offsetHeight || 360;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw zones
    for (const zone of zones) {
      const zc = ZONE_COLORS[zone.type];
      ctx.fillStyle = zc.fill;
      ctx.strokeStyle = zc.stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(zone.x * w, zone.y * h, zone.w * w, zone.h * h);
      ctx.strokeRect(zone.x * w, zone.y * h, zone.w * w, zone.h * h);
      ctx.fillStyle = zc.stroke;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(zone.label || zone.type, zone.x * w + 6, zone.y * h + 16);
    }

    // Draw live zone preview while editing
    if (drawRect) {
      const zc = ZONE_COLORS[selectedZoneType];
      ctx.fillStyle = zc.fill;
      ctx.strokeStyle = zc.stroke;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.fillRect(drawRect.x * w, drawRect.y * h, drawRect.w * w, drawRect.h * h);
      ctx.strokeRect(drawRect.x * w, drawRect.y * h, drawRect.w * w, drawRect.h * h);
      ctx.setLineDash([]);
    }

    // Draw bounding box
    if (boundingBox) {
      const color = STATE_COLORS[babyState];
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeRect(boundingBox.x * w, boundingBox.y * h, boundingBox.w * w, boundingBox.h * h);
      ctx.shadowBlur = 0;

      // Confidence label
      const label = `${Math.round(boundingBox.confidence * 100)}%`;
      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(label, boundingBox.x * w + 4, boundingBox.y * h - 6);

      // Baby state label
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(boundingBox.x * w, boundingBox.y * h + boundingBox.h * h + 2, 90, 18);
      ctx.fillStyle = color;
      ctx.font = '11px monospace';
      ctx.fillText(babyState.toUpperCase(), boundingBox.x * w + 4, boundingBox.y * h + boundingBox.h * h + 14);
    }

    // Draw pose key-points
    if (poseLandmarks) {
      ctx.fillStyle = 'rgba(59,130,246,0.8)';
      for (const lm of poseLandmarks) {
        if ((lm.visibility ?? 0) > 0.5) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });

  // Normalized coords from mouse event on canvas
  const toNorm = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingZones) return;
    drawStartRef.current = toNorm(e);
    setDrawRect(null);
    setPendingZone(null);
  }, [isEditingZones, toNorm]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingZones || !drawStartRef.current) return;
    const p = toNorm(e);
    const s = drawStartRef.current;
    setDrawRect({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }, [isEditingZones, toNorm]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingZones || !drawStartRef.current) return;
    const p = toNorm(e);
    const s = drawStartRef.current;
    const rect = {
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    };
    drawStartRef.current = null;
    setDrawRect(null);
    if (rect.w > 0.02 && rect.h > 0.02) setPendingZone(rect);
  }, [isEditingZones, toNorm]);

  const confirmZone = () => {
    if (!pendingZone) return;
    onZoneDrawn({ ...pendingZone, type: selectedZoneType, label: selectedZoneType });
    setPendingZone(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Video area */}
      <div
        className="relative w-full rounded-3xl overflow-hidden bg-[#080810] border border-white/10"
        style={{ aspectRatio: '16/9' }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: isEditingZones ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* No feed placeholder */}
        {!isMonitoring && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
            <WifiOff className="w-12 h-12 text-white/20" />
            <p className="text-white/30 text-sm">No feed active</p>
            <div className="flex gap-3 pointer-events-auto">
              <button
                onClick={onStartCamera}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full transition-all"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
              <label className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-full transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && onUploadVideo(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        )}

        {/* Live indicator (top-left) */}
        {isMonitoring && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white font-semibold uppercase tracking-widest">
              {videoMode === 'camera' ? 'LIVE' : 'DEMO'}
            </span>
          </div>
        )}

        {/* "Draw Zones" toggle button — top-right, always accessible */}
        <button
          onClick={onToggleZoneEdit}
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isEditingZones
              ? 'bg-amber-500/30 border-amber-500/60 text-amber-300'
              : 'bg-black/50 border-white/20 text-white/60 hover:text-white hover:border-white/40 backdrop-blur-sm'
          }`}
        >
          {isEditingZones ? <PencilOff className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          {isEditingZones ? 'Done' : 'Draw Zones'}
        </button>

        {/* Zone drawing overlay controls — bottom bar on video */}
        {isEditingZones && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/50 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
              Type:
            </span>
            {(['SAFE', 'WARNING', 'RESTRICTED'] as Zone['type'][]).map(t => (
              <button
                key={t}
                onClick={() => setSelectedZoneType(t)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  selectedZoneType === t
                    ? ZONE_TYPE_COLORS[t]
                    : 'border-white/20 text-white/40 bg-black/40 hover:text-white/60'
                }`}
              >
                {t}
              </button>
            ))}
            <span className="ml-auto text-xs text-white/30 bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
              Click &amp; drag to draw
            </span>
          </div>
        )}

        {/* Confirm pending zone — appears on video */}
        {pendingZone && (
          <div className="absolute inset-x-3 bottom-14 flex items-center gap-2 px-4 py-2.5 bg-black/80 backdrop-blur-sm border border-white/20 rounded-2xl">
            <span className="text-sm text-white/80 flex-1">
              Save as <span className={`font-bold ${
                selectedZoneType === 'SAFE' ? 'text-green-400' :
                selectedZoneType === 'WARNING' ? 'text-amber-400' : 'text-red-400'
              }`}>{selectedZoneType}</span> zone?
            </span>
            <button onClick={confirmZone} className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all">
              Save
            </button>
            <button onClick={() => setPendingZone(null)} className="px-4 py-1 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-full transition-all">
              Discard
            </button>
          </div>
        )}

        {cameraError && (
          <div className="absolute bottom-3 left-3 right-3 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-2xl text-xs text-red-300 text-center pointer-events-none">
            {cameraError}
          </div>
        )}
      </div>

      {/* Saved zones list — shown compactly below video when editing */}
      {isEditingZones && zones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-white/30 uppercase tracking-widest px-1">Saved zones</p>
          {zones.map(zone => (
            <div key={zone.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ZONE_TYPE_COLORS[zone.type]}`}>
                {zone.type}
              </span>
              <span className="text-sm text-white/60 flex-1">{zone.label}</span>
              <button
                onClick={() => onDeleteZone(zone.id)}
                className="text-white/20 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-500/10"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
