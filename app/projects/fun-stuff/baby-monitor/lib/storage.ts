import type { Zone, MonitorEvent, MonitorSettings, DailyAnalytics, TrackingPoint, DEFAULT_SETTINGS } from '../types';
import { DEFAULT_SETTINGS as DS } from '../types';

const KEYS = {
  zones: 'baby-monitor:zones',
  events: 'baby-monitor:events',
  settings: 'baby-monitor:settings',
  analytics: 'baby-monitor:analytics',
  heatmap: 'baby-monitor:heatmap',
} as const;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HEATMAP_POINTS = 1000;

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full — ignore
  }
}

// Zones
export function getZones(): Zone[] {
  return safeGet<Zone[]>(KEYS.zones, []);
}
export function saveZones(zones: Zone[]): void {
  safeSet(KEYS.zones, zones);
}

// Events — auto-prune entries older than 7 days
export function getEvents(): MonitorEvent[] {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return safeGet<MonitorEvent[]>(KEYS.events, []).filter(e => e.timestamp >= cutoff);
}
export function appendEvent(event: MonitorEvent): void {
  const events = getEvents();
  events.push(event);
  safeSet(KEYS.events, events);
}
export function clearEvents(): void {
  safeSet(KEYS.events, []);
}
export function exportEvents(): void {
  const events = getEvents();
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baby-monitor-events-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Settings
export function getSettings(): MonitorSettings {
  return { ...DS, ...safeGet<Partial<MonitorSettings>>(KEYS.settings, {}) };
}
export function saveSettings(settings: MonitorSettings): void {
  safeSet(KEYS.settings, settings);
}

// Daily Analytics
export function getAnalytics(): DailyAnalytics[] {
  return safeGet<DailyAnalytics[]>(KEYS.analytics, []);
}
export function saveAnalytics(analytics: DailyAnalytics[]): void {
  safeSet(KEYS.analytics, analytics);
}
export function upsertDailyAnalytics(day: DailyAnalytics): void {
  const all = getAnalytics();
  const idx = all.findIndex(d => d.date === day.date);
  if (idx >= 0) all[idx] = day;
  else all.push(day);
  saveAnalytics(all);
}

// Heatmap — circular buffer of last N points
export function getHeatmapPoints(): TrackingPoint[] {
  return safeGet<TrackingPoint[]>(KEYS.heatmap, []);
}
export function appendHeatmapPoint(point: TrackingPoint): void {
  const pts = getHeatmapPoints();
  pts.push(point);
  if (pts.length > MAX_HEATMAP_POINTS) pts.splice(0, pts.length - MAX_HEATMAP_POINTS);
  safeSet(KEYS.heatmap, pts);
}
export function clearHeatmap(): void {
  safeSet(KEYS.heatmap, []);
}
