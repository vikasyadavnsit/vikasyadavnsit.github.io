'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { MonitorEvent, EventType, AlertSeverity } from '../types';
import { EVENT_MESSAGES, EVENT_SEVERITY } from '../types';
import { appendEvent, getEvents, clearEvents, exportEvents } from '../lib/storage';
import { speak, playBeep } from '../lib/audioEngine';
import { getSettings } from '../lib/storage';

export function useEventLog() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  useEffect(() => { setEvents(getEvents()); }, []);
  const lastEmittedAt = useRef<Partial<Record<EventType, number>>>({});
  const DEBOUNCE_MS = 2000;

  const addEvent = useCallback((type: EventType, overrides?: Partial<MonitorEvent>) => {
    const now = Date.now();

    // Check if this event type is enabled in settings
    const settings = getSettings();
    if (settings.enabledDetections && !settings.enabledDetections[type]) return;

    const last = lastEmittedAt.current[type] ?? 0;
    if (now - last < DEBOUNCE_MS) return;
    lastEmittedAt.current[type] = now;

    const severity: AlertSeverity = overrides?.severity ?? EVENT_SEVERITY[type];
    const message = overrides?.message ?? EVENT_MESSAGES[type];

    const event: MonitorEvent = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      timestamp: now,
      message,
      audioAlerted: false,
      ...overrides,
    };
    if (settings.audioAlertsEnabled) {
      playBeep(severity);
    }
    if (settings.voiceAnnouncementsEnabled) {
      speak(message, severity, type);
      event.audioAlerted = true;
    }

    appendEvent(event);
    setEvents(prev => [...prev, event]);
  }, []);

  const clearHistory = useCallback(() => {
    clearEvents();
    setEvents([]);
  }, []);

  const exportHistory = useCallback(() => {
    exportEvents();
  }, []);

  const refreshEvents = useCallback(() => {
    setEvents(getEvents());
  }, []);

  return { events, addEvent, clearHistory, exportHistory, refreshEvents };
}
