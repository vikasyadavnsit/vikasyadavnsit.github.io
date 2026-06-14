'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Moon, Activity, Zap, Shield } from 'lucide-react';
import type { BabyState, BoundingBox, MonitorEvent, AudioState } from '../types';

const STATE_CONFIG: Record<BabyState, { label: string; icon: typeof Eye; color: string; bg: string }> = {
  sleeping: { label: 'Sleeping', icon: Moon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  active: { label: 'Active', icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
  restless: { label: 'Restless', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  not_visible: { label: 'Not Visible', icon: EyeOff, color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

const AUDIO_LABELS: Record<AudioState, string> = {
  crying: 'Crying detected',
  loud: 'Loud noise',
  silent: 'Quiet',
};

interface DashboardProps {
  babyState: BabyState;
  boundingBox: BoundingBox | null;
  audioState: AudioState;
  recentAlerts: MonitorEvent[];
  sessionStartMs: number | null;
  isMonitoring: boolean;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function Dashboard({
  babyState,
  boundingBox,
  audioState,
  recentAlerts,
  sessionStartMs,
  isMonitoring,
}: DashboardProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isMonitoring || !sessionStartMs) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isMonitoring, sessionStartMs]);

  const cfg = STATE_CONFIG[babyState];
  const Icon = cfg.icon;
  const confidence = boundingBox?.confidence ?? 0;
  // tick dependency ensures this recalculates every second
  const elapsed = sessionStartMs ? Date.now() - sessionStartMs : 0;
  void tick;

  return (
    <div className="space-y-4">
      {/* Primary status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          key={babyState}
          initial={{ scale: 0.96, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border border-white/[0.06] ${cfg.bg}`}
        >
          <Icon className={`w-10 h-10 ${cfg.color}`} />
          <div className="text-center">
            <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-white/40 mt-0.5">Current State</p>
          </div>
        </motion.div>

        <div className="flex flex-col justify-center gap-3 p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-white/40 uppercase tracking-widest">Confidence</p>
          <p className="text-3xl font-bold text-white">{Math.round(confidence * 100)}%</p>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              animate={{ width: `${confidence * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
          <p className="text-xs text-white/30">{boundingBox ? 'Person tracked' : 'Not detected'}</p>
        </div>

        <div className="flex flex-col justify-center gap-3 p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-white/40 uppercase tracking-widest">Session</p>
          <p className="text-3xl font-bold text-white">
            {isMonitoring && sessionStartMs ? formatElapsed(elapsed) : '—'}
          </p>
          <p className="text-xs text-white/30">
            Audio: <span className="text-white/60">{AUDIO_LABELS[audioState]}</span>
          </p>
          <p className="text-xs text-white/30">
            Alerts today: <span className="text-white/60">{recentAlerts.filter(a => a.severity !== 'INFO').length}</span>
          </p>
        </div>
      </div>

      {/* Recent alerts */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-white/40" />
          <p className="text-xs text-white/40 uppercase tracking-widest">Recent Alerts</p>
        </div>
        {recentAlerts.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No alerts yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...recentAlerts].reverse().slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  a.severity === 'CRITICAL' ? 'bg-red-500' :
                  a.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <span className="text-white/60 flex-1">{a.message}</span>
                <span className="text-white/30 text-xs flex-shrink-0">
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
