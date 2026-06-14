'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, Monitor, LayoutDashboard, BarChart2, Settings,
  Play, Square, Mic, MicOff, Loader2,
} from 'lucide-react';

import type { Zone, BoundingBox, PoseLandmark, BabyState, AudioState, MonitorSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { getZones, saveZones, getSettings } from './lib/storage';
import { useMediaPipe } from './hooks/useMediaPipe';
import { useAudioDetection } from './hooks/useAudioDetection';
import { useZoneDetection } from './hooks/useZoneDetection';
import { useEventLog } from './hooks/useEventLog';
import { useAnalytics } from './hooks/useAnalytics';

import MonitorView from './components/MonitorView';
import Dashboard from './components/Dashboard';
import EventTimeline from './components/EventTimeline';
import AnalyticsPanel from './components/AnalyticsPanel';
import SettingsPanel from './components/SettingsPanel';
import AlertBanner from './components/AlertBanner';

type Tab = 'monitor' | 'dashboard' | 'analytics' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Monitor }[] = [
  { id: 'monitor', label: 'Monitor', icon: Monitor },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BabyMonitorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('monitor');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isEditingZones, setIsEditingZones] = useState(false);
  const [videoMode, setVideoMode] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [settings, setSettings] = useState<MonitorSettings>(() => ({ ...DEFAULT_SETTINGS }));
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);

  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [poseLandmarks, setPoseLandmarks] = useState<PoseLandmark[] | null>(null);
  const [babyState, setBabyState] = useState<BabyState>('not_visible');
  const [audioState, setAudioState] = useState<AudioState>('silent');

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Hydrate localStorage-backed state after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    setZones(getZones());
    setSettings(s => ({ ...DEFAULT_SETTINGS, ...getSettings(), enabledDetections: { ...DEFAULT_SETTINGS.enabledDetections, ...getSettings().enabledDetections } }));
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const invisibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBabyStateRef = useRef<BabyState>('not_visible');
  const fallDetectedRef = useRef(false);

  const { events, addEvent, clearHistory, exportHistory } = useEventLog();
  const { summary, heatmapPoints, addTrackingPoint } = useAnalytics(events);

  // MediaPipe detection callback
  const handleDetectionResult = useCallback((result: {
    boundingBox: BoundingBox | null;
    poseLandmarks: PoseLandmark[] | null;
    babyState: BabyState;
    isLowLight: boolean;
    isCameraBlocked: boolean;
  }) => {
    setBoundingBox(result.boundingBox);
    setPoseLandmarks(result.poseLandmarks);
    setBabyState(result.babyState);

    // Track heatmap
    if (result.boundingBox) {
      const cx = result.boundingBox.x + result.boundingBox.w / 2;
      const cy = result.boundingBox.y + result.boundingBox.h / 2;
      addTrackingPoint(cx, cy);
    }

    // Visibility tracking
    if (!result.boundingBox) {
      if (!invisibleTimerRef.current) {
        invisibleTimerRef.current = setTimeout(() => {
          addEvent('NOT_VISIBLE');
          invisibleTimerRef.current = null;
        }, settings.invisibleThresholdSec * 1000);
      }
    } else {
      if (invisibleTimerRef.current) {
        clearTimeout(invisibleTimerRef.current);
        invisibleTimerRef.current = null;
      }
      if (prevBabyStateRef.current === 'not_visible') {
        addEvent('VISIBLE_AGAIN');
      }
    }

    // Baby state transitions
    const prev = prevBabyStateRef.current;
    const curr = result.babyState;
    if (prev !== curr) {
      if (curr === 'sleeping') addEvent('SLEEP_START');
      if (prev === 'sleeping' && curr !== 'not_visible') addEvent('SLEEP_END');
      if (curr === 'restless') addEvent('RESTLESS');
    }
    prevBabyStateRef.current = curr;

    // Fall detection: if pose landmarks show horizontal collapse
    if (result.poseLandmarks && result.poseLandmarks.length > 24) {
      const lm = result.poseLandmarks;
      const leftShoulder = lm[11];
      const rightShoulder = lm[12];
      const leftHip = lm[23];
      const rightHip = lm[24];
      const shoulderY = ((leftShoulder?.y ?? 0) + (rightShoulder?.y ?? 0)) / 2;
      const hipY = ((leftHip?.y ?? 0) + (rightHip?.y ?? 0)) / 2;
      const leftVis = (leftShoulder?.visibility ?? 0) > 0.3;
      const rightVis = (rightShoulder?.visibility ?? 0) > 0.3;
      if (leftVis && rightVis && shoulderY > hipY + 0.02 && !fallDetectedRef.current) {
        fallDetectedRef.current = true;
        addEvent('POSSIBLE_FALL');
        setTimeout(() => { fallDetectedRef.current = false; }, 5000);
      }
    }

    // Camera blocked / low light
    if (result.isCameraBlocked) addEvent('CAMERA_BLOCKED');
    if (result.isLowLight) addEvent('LOW_LIGHT');

  }, [addEvent, addTrackingPoint, settings.invisibleThresholdSec]);

  const mediaPipe = useMediaPipe(videoRef, handleDetectionResult, settings.movementSensitivity);

  // Audio detection callback
  const handleAudioState = useCallback((state: AudioState, confidence: number) => {
    setAudioState(state);
    if (state === 'crying') addEvent('CRY_DETECTED', { confidence });
    if (state === 'loud') addEvent('LOUD_NOISE', { confidence });
  }, [addEvent]);

  const audioDetection = useAudioDetection(handleAudioState);
  const zoneDetection = useZoneDetection(zones);

  // Zone transition events
  useEffect(() => {
    if (!boundingBox) return;
    const { entered, exited } = zoneDetection.testZones(boundingBox);
    for (const zone of exited) {
      if (zone.type === 'SAFE') addEvent('LEFT_SAFE_ZONE', { babyPosition: { x: boundingBox.x, y: boundingBox.y } });
    }
    for (const zone of entered) {
      if (zone.type === 'SAFE') addEvent('RETURNED_SAFE_ZONE');
      if (zone.type === 'WARNING') addEvent('EXCESSIVE_MOVEMENT');
      if (zone.type === 'RESTRICTED') addEvent('LEFT_SAFE_ZONE', { severity: 'CRITICAL', message: 'Alert. Baby has entered a restricted zone.' });
    }
  }, [boundingBox, zoneDetection, addEvent]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: settings.videoDeviceId ? { exact: settings.videoDeviceId } : undefined },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          await mediaPipe.init();
          mediaPipe.startDetection();
          setIsMonitoring(true);
          setVideoMode('camera');
          setSessionStartMs(Date.now());
        };
      }
    } catch (e) {
      setCameraError(e instanceof Error ? e.message : 'Camera access denied');
    }
  }, [settings.videoDeviceId, mediaPipe]);

  const uploadVideo = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.loop = true;
      videoRef.current.onloadedmetadata = async () => {
        videoRef.current?.play();
        await mediaPipe.init();
        mediaPipe.startDetection();
        setIsMonitoring(true);
        setVideoMode('upload');
        setSessionStartMs(Date.now());
      };
    }
  }, [mediaPipe]);

  const stopMonitoring = useCallback(() => {
    mediaPipe.stopDetection();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    audioDetection.stop();
    if (invisibleTimerRef.current) clearTimeout(invisibleTimerRef.current);
    setIsMonitoring(false);
    setSessionStartMs(null);
    setBoundingBox(null);
    setPoseLandmarks(null);
    setBabyState('not_visible');
  }, [mediaPipe, audioDetection]);

  const toggleMic = useCallback(() => {
    if (audioDetection.isActive) {
      audioDetection.stop();
    } else {
      audioDetection.start(settings.audioDeviceId);
    }
  }, [audioDetection, settings.audioDeviceId]);

  const handleZoneDrawn = useCallback((zone: Omit<Zone, 'id'>) => {
    const newZone: Zone = { ...zone, id: `zone-${Date.now()}` };
    const updated = [...zones, newZone];
    setZones(updated);
    saveZones(updated);
  }, [zones]);

  const handleDeleteZone = useCallback((id: string) => {
    const updated = zones.filter(z => z.id !== id);
    setZones(updated);
    saveZones(updated);
  }, [zones]);

  const handleSettingsSave = useCallback((s: MonitorSettings) => {
    setSettings(s);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  }, []);

  const activeAlerts = events
    .filter(e => !dismissedAlerts.has(e.id) && Date.now() - e.timestamp < 60_000)
    .slice(-5);

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            href="/projects/fun-stuff"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-6 group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                AI Baby <span className="text-white/40">Monitor</span>
              </h1>
              <p className="text-white/40 text-sm mt-2">
                On-device AI · No cloud · 100% private · Best results with only the baby in frame
              </p>
            </div>

            {/* Monitor controls */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                {isMonitoring && (
                  <>
                    <button
                      onClick={toggleMic}
                      disabled={audioDetection.isLoading}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold transition-all disabled:opacity-50 ${
                        audioDetection.isActive
                          ? 'bg-green-500/20 border-green-500/40 text-green-400'
                          : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                      }`}
                      title={audioDetection.isActive ? 'Disable cry detection' : 'Enable cry detection'}
                    >
                      {audioDetection.isLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : audioDetection.isActive
                          ? <Mic className="w-4 h-4" />
                          : <MicOff className="w-4 h-4" />
                      }
                      Cry Detection
                    </button>
                    <button
                      onClick={stopMonitoring}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-bold rounded-full transition-all"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop
                    </button>
                  </>
                )}
                {!isMonitoring && (
                  <button
                    onClick={startCamera}
                    disabled={mediaPipe.isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-full transition-all"
                  >
                    {mediaPipe.isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Loading AI…</>
                    ) : (
                      <><Play className="w-4 h-4" />Start</>
                    )}
                  </button>
                )}
              </div>
              {audioDetection.error && (
                <p className="text-xs text-red-400">{audioDetection.error}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Alert banner */}
        {activeAlerts.length > 0 && (
          <div className="mb-4">
            <AlertBanner activeAlerts={activeAlerts} onDismiss={dismissAlert} />
          </div>
        )}

        {/* MediaPipe error */}
        {mediaPipe.error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400">
            AI model error: {mediaPipe.error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl mb-6 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content — all tabs stay mounted; CSS hides inactive ones to preserve video srcObject */}
        <div>
          <div className={activeTab === 'monitor' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'hidden'}>
            <div className="lg:col-span-2 space-y-4">
              <MonitorView
                videoRef={videoRef}
                isMonitoring={isMonitoring}
                boundingBox={boundingBox}
                poseLandmarks={poseLandmarks}
                babyState={babyState}
                zones={zones}
                isEditingZones={isEditingZones}
                onToggleZoneEdit={() => setIsEditingZones(v => !v)}
                onZoneDrawn={handleZoneDrawn}
                onDeleteZone={handleDeleteZone}
                onStartCamera={startCamera}
                onUploadVideo={uploadVideo}
                cameraError={cameraError}
                videoMode={videoMode}
              />
            </div>
            <div>
              <Dashboard
                babyState={babyState}
                boundingBox={boundingBox}
                audioState={audioState}
                recentAlerts={events}
                sessionStartMs={sessionStartMs}
                isMonitoring={isMonitoring}
              />
            </div>
          </div>

          <div className={activeTab === 'dashboard' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'hidden'}>
            <Dashboard
              babyState={babyState}
              boundingBox={boundingBox}
              audioState={audioState}
              recentAlerts={events}
              sessionStartMs={sessionStartMs}
              isMonitoring={isMonitoring}
            />
            <EventTimeline
              events={events}
              onClear={clearHistory}
              onExport={exportHistory}
            />
          </div>

          <div className={activeTab === 'analytics' ? '' : 'hidden'}>
            <AnalyticsPanel summary={summary} heatmapPoints={heatmapPoints} />
          </div>

          <div className={activeTab === 'settings' ? '' : 'hidden'}>
            <SettingsPanel onSave={handleSettingsSave} />
          </div>
        </div>
      </div>
    </main>
  );
}
