export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ZoneType = 'SAFE' | 'WARNING' | 'RESTRICTED';
export type BabyState = 'sleeping' | 'active' | 'restless' | 'not_visible';
export type AudioState = 'crying' | 'loud' | 'silent';
export type EventType =
  | 'LEFT_SAFE_ZONE'
  | 'RETURNED_SAFE_ZONE'
  | 'NOT_VISIBLE'
  | 'VISIBLE_AGAIN'
  | 'POSSIBLE_FALL'
  | 'EXCESSIVE_MOVEMENT'
  | 'CAMERA_BLOCKED'
  | 'CAMERA_DISCONNECTED'
  | 'LOW_LIGHT'
  | 'CRY_DETECTED'
  | 'LOUD_NOISE'
  | 'SLEEP_START'
  | 'SLEEP_END'
  | 'RESTLESS';

// x, y, w, h are normalized 0–1 (display-size-independent)
export interface Zone {
  id: string;
  type: ZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface BoundingBox {
  x: number; // normalized 0–1
  y: number;
  w: number;
  h: number;
  confidence: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface MonitorEvent {
  id: string;
  type: EventType;
  severity: AlertSeverity;
  timestamp: number;
  message: string;
  babyPosition?: { x: number; y: number };
  confidence?: number;
  audioAlerted: boolean;
}

export interface TrackingPoint {
  timestamp: number;
  x: number; // normalized 0–1 center of bounding box
  y: number;
}

export interface MonitorSettings {
  invisibleThresholdSec: number;
  movementSensitivity: number; // 1–5
  audioAlertsEnabled: boolean;
  voiceAnnouncementsEnabled: boolean;
  alertVolume: number; // 0–1
  videoDeviceId?: string;
  audioDeviceId?: string;
  enabledDetections: Record<EventType, boolean>;
}

export interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  alertCount: number;
  fallCount: number;
  visibilityIncidents: number;
  cryIncidents: number;
  sleepDurationMs: number;
  activityDurationMs: number;
}

export interface DetectionResult {
  boundingBox: BoundingBox | null;
  poseLandmarks: PoseLandmark[] | null;
  babyState: BabyState;
  isLowLight: boolean;
  isCameraBlocked: boolean;
}

export interface AnalyticsSummary {
  sleepDurationMs: number;
  activityDurationMs: number;
  cribExits: number;
  possibleFalls: number;
  cryEvents: number;
  longestSleepMs: number;
  mostActivePeriod: string;
  daily: DailyAnalytics[];
}

export const DEFAULT_SETTINGS: MonitorSettings = {
  invisibleThresholdSec: 10,
  movementSensitivity: 3,
  audioAlertsEnabled: true,
  voiceAnnouncementsEnabled: true,
  alertVolume: 0.8,
  enabledDetections: {
    LEFT_SAFE_ZONE: true,
    RETURNED_SAFE_ZONE: true,
    NOT_VISIBLE: true,
    VISIBLE_AGAIN: true,
    POSSIBLE_FALL: true,
    EXCESSIVE_MOVEMENT: true,
    CAMERA_BLOCKED: true,
    CAMERA_DISCONNECTED: true,
    LOW_LIGHT: true,
    CRY_DETECTED: true,
    LOUD_NOISE: true,
    SLEEP_START: true,
    SLEEP_END: true,
    RESTLESS: false,
  },
};

export const EVENT_MESSAGES: Record<EventType, string> = {
  LEFT_SAFE_ZONE: 'Warning. Baby has left the safe zone.',
  RETURNED_SAFE_ZONE: 'Baby has returned to the safe zone.',
  NOT_VISIBLE: 'Baby is no longer visible.',
  VISIBLE_AGAIN: 'Baby is visible again.',
  POSSIBLE_FALL: 'Alert. Possible fall detected.',
  EXCESSIVE_MOVEMENT: 'Warning. Excessive movement detected.',
  CAMERA_BLOCKED: 'Warning. Camera appears to be blocked.',
  CAMERA_DISCONNECTED: 'Alert. Camera has been disconnected.',
  LOW_LIGHT: 'Warning. Low light conditions detected.',
  CRY_DETECTED: 'Alert. Baby crying detected.',
  LOUD_NOISE: 'Loud noise detected near the baby.',
  SLEEP_START: 'Baby has fallen asleep.',
  SLEEP_END: 'Baby has woken up.',
  RESTLESS: 'Baby is restless.',
};

export const EVENT_SEVERITY: Record<EventType, AlertSeverity> = {
  LEFT_SAFE_ZONE: 'WARNING',
  RETURNED_SAFE_ZONE: 'INFO',
  NOT_VISIBLE: 'WARNING',
  VISIBLE_AGAIN: 'INFO',
  POSSIBLE_FALL: 'CRITICAL',
  EXCESSIVE_MOVEMENT: 'WARNING',
  CAMERA_BLOCKED: 'WARNING',
  CAMERA_DISCONNECTED: 'CRITICAL',
  LOW_LIGHT: 'WARNING',
  CRY_DETECTED: 'CRITICAL',
  LOUD_NOISE: 'WARNING',
  SLEEP_START: 'INFO',
  SLEEP_END: 'INFO',
  RESTLESS: 'INFO',
};
