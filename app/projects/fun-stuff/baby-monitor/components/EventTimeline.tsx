'use client';
import { Download, Trash2, AlertCircle, AlertTriangle, Info, Volume2 } from 'lucide-react';
import type { MonitorEvent, AlertSeverity } from '../types';

const severityIcon = (s: AlertSeverity) => {
  if (s === 'CRITICAL') return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
  if (s === 'WARNING') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
};

const severityBadge: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  WARNING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  INFO: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

interface EventTimelineProps {
  events: MonitorEvent[];
  onClear: () => void;
  onExport: () => void;
}

export default function EventTimeline({ events, onClear, onExport }: EventTimelineProps) {
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white">Event Timeline</h3>
          <p className="text-xs text-white/40">{events.length} events · last 7 days</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold rounded-full border border-white/10 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-full border border-red-500/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[480px] pr-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-white/20">
            <Info className="w-8 h-8" />
            <p className="text-sm">No events recorded yet.</p>
          </div>
        ) : (
          sorted.map(event => (
            <div
              key={event.id}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
            >
              {severityIcon(event.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">{event.message}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  {' · '}
                  {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {event.audioAlerted && <Volume2 className="w-3 h-3 text-white/20" />}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge[event.severity]}`}>
                  {event.severity}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
