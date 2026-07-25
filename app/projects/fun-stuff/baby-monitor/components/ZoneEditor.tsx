'use client';
import { Trash2, MapPin } from 'lucide-react';
import type { Zone } from '../types';

const typeColors: Record<Zone['type'], string> = {
  SAFE: 'text-green-400 bg-green-500/10 border-green-500/30',
  WARNING: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  RESTRICTED: 'text-red-400 bg-red-500/10 border-red-500/30',
};

interface ZoneEditorProps {
  zones: Zone[];
  onDeleteZone: (id: string) => void;
}

export default function ZoneEditor({ zones, onDeleteZone }: ZoneEditorProps) {
  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-white/30">
        <MapPin className="w-8 h-8" />
        <p className="text-sm">No zones defined yet.</p>
        <p className="text-xs">Enable &quot;Edit Zones&quot; and drag on the video to draw one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {zones.map(zone => (
        <div
          key={zone.id}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
        >
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeColors[zone.type]}`}>
            {zone.type}
          </span>
          <span className="text-sm text-white/70 flex-1">{zone.label}</span>
          <span className="text-xs text-white/30 font-mono">
            {Math.round(zone.x * 100)}%,{Math.round(zone.y * 100)}% · {Math.round(zone.w * 100)}×{Math.round(zone.h * 100)}
          </span>
          <button
            onClick={() => onDeleteZone(zone.id)}
            className="text-white/30 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
