import type { MonitorEvent, DailyAnalytics, TrackingPoint, AnalyticsSummary } from '../types';

function toDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function computeDailyAnalytics(events: MonitorEvent[]): DailyAnalytics[] {
  const byDate = new Map<string, MonitorEvent[]>();
  for (const e of events) {
    const d = toDateStr(e.timestamp);
    const arr = byDate.get(d) ?? [];
    arr.push(e);
    byDate.set(d, arr);
  }

  const result: DailyAnalytics[] = [];
  for (const [date, evts] of byDate) {
    let sleepDurationMs = 0;
    let activityDurationMs = 0;
    let sleepStart: number | null = null;
    let activeStart: number | null = null;

    for (const e of evts.sort((a, b) => a.timestamp - b.timestamp)) {
      if (e.type === 'SLEEP_START') {
        sleepStart = e.timestamp;
        if (activeStart !== null) {
          activityDurationMs += e.timestamp - activeStart;
          activeStart = null;
        }
      } else if (e.type === 'SLEEP_END') {
        if (sleepStart !== null) {
          sleepDurationMs += e.timestamp - sleepStart;
          sleepStart = null;
        }
        activeStart = e.timestamp;
      }
    }

    result.push({
      date,
      alertCount: evts.filter(e => e.severity !== 'INFO').length,
      fallCount: evts.filter(e => e.type === 'POSSIBLE_FALL').length,
      visibilityIncidents: evts.filter(e => e.type === 'NOT_VISIBLE').length,
      cryIncidents: evts.filter(e => e.type === 'CRY_DETECTED').length,
      sleepDurationMs,
      activityDurationMs,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeAnalyticsSummary(events: MonitorEvent[]): AnalyticsSummary {
  const daily = computeDailyAnalytics(events);

  const today = toDateStr(Date.now());
  const todayData = daily.find(d => d.date === today);

  // Compute longest sleep session
  let longestSleepMs = 0;
  let sleepStart: number | null = null;
  for (const e of events.sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.type === 'SLEEP_START') sleepStart = e.timestamp;
    if (e.type === 'SLEEP_END' && sleepStart !== null) {
      longestSleepMs = Math.max(longestSleepMs, e.timestamp - sleepStart);
      sleepStart = null;
    }
  }

  // Most active period — count events per hour bucket
  const hourCounts: number[] = new Array(24).fill(0);
  for (const e of events) {
    const h = new Date(e.timestamp).getHours();
    hourCounts[h]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const nextHour = (peakHour + 1) % 24;
  const fmt = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${ampm}`;
  };
  const mostActivePeriod = `${fmt(peakHour)} – ${fmt(nextHour)}`;

  return {
    sleepDurationMs: todayData?.sleepDurationMs ?? 0,
    activityDurationMs: todayData?.activityDurationMs ?? 0,
    cribExits: events.filter(e => e.type === 'LEFT_SAFE_ZONE').length,
    possibleFalls: events.filter(e => e.type === 'POSSIBLE_FALL').length,
    cryEvents: events.filter(e => e.type === 'CRY_DETECTED').length,
    longestSleepMs,
    mostActivePeriod,
    daily,
  };
}

export function computeHeatmapGrid(
  points: TrackingPoint[],
  gridW: number,
  gridH: number,
): number[][] {
  const grid: number[][] = Array.from({ length: gridH }, () => new Array(gridW).fill(0));
  for (const pt of points) {
    const gx = Math.min(Math.floor(pt.x * gridW), gridW - 1);
    const gy = Math.min(Math.floor(pt.y * gridH), gridH - 1);
    grid[gy][gx]++;
  }
  return grid;
}

export { formatDuration };
