'use client';
import { useState, useCallback, useEffect } from 'react';
import type { MonitorEvent, AnalyticsSummary, TrackingPoint } from '../types';
import { computeAnalyticsSummary } from '../lib/analytics';
import { getHeatmapPoints, appendHeatmapPoint, clearHeatmap } from '../lib/storage';

export function useAnalytics(events: MonitorEvent[]) {
  const [heatmapPoints, setHeatmapPoints] = useState<TrackingPoint[]>([]);
  useEffect(() => { setHeatmapPoints(getHeatmapPoints()); }, []);

  const summary: AnalyticsSummary = computeAnalyticsSummary(events);

  const addTrackingPoint = useCallback((x: number, y: number) => {
    const pt: TrackingPoint = { timestamp: Date.now(), x, y };
    appendHeatmapPoint(pt);
    setHeatmapPoints(prev => {
      const next = [...prev, pt];
      return next.length > 1000 ? next.slice(next.length - 1000) : next;
    });
  }, []);

  const clearAllData = useCallback(() => {
    clearHeatmap();
    setHeatmapPoints([]);
  }, []);

  return { summary, heatmapPoints, addTrackingPoint, clearAllData };
}
