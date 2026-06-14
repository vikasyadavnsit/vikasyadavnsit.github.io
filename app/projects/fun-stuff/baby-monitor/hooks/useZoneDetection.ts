'use client';
import { useRef, useCallback } from 'react';
import type { Zone, BoundingBox } from '../types';

interface ZoneHit {
  zone: Zone;
  inside: boolean;
}

function isInsideZone(zone: Zone, cx: number, cy: number): boolean {
  return (
    cx >= zone.x &&
    cx <= zone.x + zone.w &&
    cy >= zone.y &&
    cy <= zone.y + zone.h
  );
}

export function useZoneDetection(zones: Zone[]) {
  const prevZoneIds = useRef<Set<string>>(new Set());

  const testZones = useCallback(
    (bbox: BoundingBox | null): { hits: ZoneHit[]; entered: Zone[]; exited: Zone[] } => {
      if (!bbox) {
        prevZoneIds.current.clear();
        return { hits: [], entered: [], exited: [] };
      }

      const cx = bbox.x + bbox.w / 2;
      const cy = bbox.y + bbox.h / 2;

      const currentIds = new Set<string>();
      const hits: ZoneHit[] = [];

      for (const zone of zones) {
        const inside = isInsideZone(zone, cx, cy);
        hits.push({ zone, inside });
        if (inside) currentIds.add(zone.id);
      }

      const entered: Zone[] = [];
      const exited: Zone[] = [];

      for (const zone of zones) {
        const wasInside = prevZoneIds.current.has(zone.id);
        const isIn = currentIds.has(zone.id);
        if (!wasInside && isIn) entered.push(zone);
        if (wasInside && !isIn) exited.push(zone);
      }

      prevZoneIds.current = currentIds;
      return { hits, entered, exited };
    },
    [zones],
  );

  const reset = useCallback(() => {
    prevZoneIds.current.clear();
  }, []);

  return { testZones, reset };
}
