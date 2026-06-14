'use client';
import { Moon, Activity, LogOut, AlertTriangle, Baby, Clock } from 'lucide-react';
import type { AnalyticsSummary } from '../types';
import { formatDuration } from '../lib/analytics';

interface DailySummaryProps {
  summary: AnalyticsSummary;
}

export default function DailySummary({ summary }: DailySummaryProps) {
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/[0.08]">
      <div className="flex items-center gap-2 mb-6">
        <Baby className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-white text-lg">Baby Activity Summary</h3>
        <span className="text-xs text-white/30 ml-auto">Today</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatRow icon={Moon} label="Sleep Duration" value={formatDuration(summary.sleepDurationMs)} color="text-blue-400" />
        <StatRow icon={Activity} label="Active Duration" value={formatDuration(summary.activityDurationMs)} color="text-green-400" />
        <StatRow icon={LogOut} label="Crib Exits" value={String(summary.cribExits)} color="text-amber-400" />
        <StatRow icon={AlertTriangle} label="Possible Falls" value={String(summary.possibleFalls)} color="text-red-400" />
        <StatRow icon={Baby} label="Cry Events" value={String(summary.cryEvents)} color="text-pink-400" />
        <StatRow icon={Clock} label="Longest Sleep" value={formatDuration(summary.longestSleepMs)} color="text-purple-400" />
      </div>

      <div className="pt-4 border-t border-white/[0.06]">
        <p className="text-xs text-white/40 mb-1">Most Active Period</p>
        <p className="text-white font-semibold">{summary.mostActivePeriod || 'Insufficient data'}</p>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Moon;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
