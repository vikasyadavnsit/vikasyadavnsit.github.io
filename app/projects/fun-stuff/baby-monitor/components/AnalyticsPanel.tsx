'use client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { AnalyticsSummary, TrackingPoint } from '../types';
import { formatDuration } from '../lib/analytics';
import HeatmapCanvas from './HeatmapCanvas';
import DailySummary from './DailySummary';

const TIP_STYLE = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
};

interface AnalyticsPanelProps {
  summary: AnalyticsSummary;
  heatmapPoints: TrackingPoint[];
}

export default function AnalyticsPanel({ summary, heatmapPoints }: AnalyticsPanelProps) {
  const alertTrendData = summary.daily.map(d => ({
    date: d.date.slice(5), // MM-DD
    alerts: d.alertCount,
    falls: d.fallCount,
  }));

  const activityData = summary.daily.map(d => ({
    date: d.date.slice(5),
    sleep: Math.round(d.sleepDurationMs / 60000),
    active: Math.round(d.activityDurationMs / 60000),
  }));

  const eventDistData = [
    { name: 'Cry', value: summary.cryEvents },
    { name: 'Falls', value: summary.possibleFalls },
    { name: 'Exits', value: summary.cribExits },
    { name: 'Alerts', value: summary.daily.reduce((s, d) => s + d.alertCount, 0) },
  ];

  return (
    <div className="space-y-6">
      <DailySummary summary={summary} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Alerts" value={String(summary.daily.reduce((s, d) => s + d.alertCount, 0))} color="text-amber-400" />
        <StatCard label="Falls" value={String(summary.possibleFalls)} color="text-red-400" />
        <StatCard label="Cry Events" value={String(summary.cryEvents)} color="text-pink-400" />
        <StatCard label="Sleep Today" value={formatDuration(summary.sleepDurationMs)} color="text-blue-400" />
      </div>

      {/* Alert trend */}
      {alertTrendData.length > 0 && (
        <ChartCard title="Daily Alert Trend">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={alertTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="alerts" stroke="#f59e0b" strokeWidth={2} dot={false} name="Alerts" />
              <Line type="monotone" dataKey="falls" stroke="#ef4444" strokeWidth={2} dot={false} name="Falls" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Activity trend */}
      {activityData.length > 0 && (
        <ChartCard title="Sleep vs Activity (minutes)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={TIP_STYLE} />
              <Legend />
              <Bar dataKey="sleep" fill="#60a5fa" name="Sleep (min)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="active" fill="#34d399" name="Active (min)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Event distribution */}
      <ChartCard title="Event Distribution">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={eventDistData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={48} />
            <Tooltip contentStyle={TIP_STYLE} />
            <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Heatmap */}
      <ChartCard title="Position Heatmap">
        <HeatmapCanvas points={heatmapPoints} />
        <p className="text-xs text-white/30 mt-2 text-center">
          Blue = rarely visited · Red = most visited areas
        </p>
      </ChartCard>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06]">
      <p className="text-sm font-semibold text-white/70 mb-4">{title}</p>
      {children}
    </div>
  );
}
