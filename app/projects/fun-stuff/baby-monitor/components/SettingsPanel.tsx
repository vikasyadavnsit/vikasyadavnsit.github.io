'use client';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { MonitorSettings, EventType, AlertSeverity } from '../types';
import { DEFAULT_SETTINGS, EVENT_SEVERITY } from '../types';
import { getSettings, saveSettings } from '../lib/storage';

interface SettingsPanelProps {
  onSave: (settings: MonitorSettings) => void;
}

// Human-readable display metadata for each event type
const EVENT_META: Record<EventType, { label: string; description: string; group: string }> = {
  LEFT_SAFE_ZONE:       { label: 'Left safe zone',          description: 'Fires when the baby exits a zone marked SAFE.',                  group: 'Safety' },
  RETURNED_SAFE_ZONE:   { label: 'Returned to safe zone',   description: 'Fires when the baby re-enters a SAFE zone.',                     group: 'Safety' },
  POSSIBLE_FALL:        { label: 'Possible fall',           description: 'Fires when pose landmarks suggest a sudden horizontal collapse.', group: 'Safety' },
  EXCESSIVE_MOVEMENT:   { label: 'Excessive movement',      description: 'Fires when the baby enters a WARNING zone.',                     group: 'Safety' },
  NOT_VISIBLE:          { label: 'Baby not visible',        description: 'Fires after the baby is out of frame for the configured threshold.', group: 'Visibility' },
  VISIBLE_AGAIN:        { label: 'Baby visible again',      description: 'Fires when the baby re-enters the frame after being hidden.',    group: 'Visibility' },
  CAMERA_BLOCKED:       { label: 'Camera blocked',          description: 'Fires when the frame is abnormally dark (likely physically covered).', group: 'Visibility' },
  CAMERA_DISCONNECTED:  { label: 'Camera disconnected',     description: 'Fires when the camera stream is lost.',                          group: 'Visibility' },
  SLEEP_START:          { label: 'Baby fell asleep',        description: 'Fires when movement drops below the sleep threshold for ~3 seconds.', group: 'Sleep & Activity' },
  SLEEP_END:            { label: 'Baby woke up',            description: 'Fires when movement resumes after a sleep period.',              group: 'Sleep & Activity' },
  RESTLESS:             { label: 'Restless movement',       description: 'Fires when movement is above sleep but below active threshold.', group: 'Sleep & Activity' },
  CRY_DETECTED:         { label: 'Crying detected',         description: 'Fires when the AI audio model classifies mic input as crying. Requires microphone.', group: 'Audio' },
  LOUD_NOISE:           { label: 'Loud noise',              description: 'Fires when a sustained loud sound is detected via microphone. Requires microphone.', group: 'Audio' },
  LOW_LIGHT:            { label: 'Low light',               description: 'Fires when average frame brightness falls below 8%.',           group: 'Environment' },
};

const GROUPS = ['Safety', 'Visibility', 'Sleep & Activity', 'Audio', 'Environment'] as const;

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  WARNING:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  INFO:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function SettingsPanel({ onSave }: SettingsPanelProps) {
  const [settings, setSettings] = useState<MonitorSettings>({ ...DEFAULT_SETTINGS });
  useEffect(() => {
    const saved = getSettings();
    setSettings({ ...DEFAULT_SETTINGS, ...saved, enabledDetections: { ...DEFAULT_SETTINGS.enabledDetections, ...saved.enabledDetections } });
  }, []);
  const [saved, setSaved] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
    }).catch(() => {});
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    onSave(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDetection = (type: EventType, value: boolean) => {
    setSettings(s => ({
      ...s,
      enabledDetections: { ...s.enabledDetections, [type]: value },
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Detection thresholds */}
      <Section title="Detection">
        <LabeledInput
          label="Invisible Threshold"
          hint="Seconds before 'baby not visible' alert fires"
          type="number"
          min={1} max={60}
          value={settings.invisibleThresholdSec}
          onChange={v => setSettings(s => ({ ...s, invisibleThresholdSec: Number(v) }))}
        />
        <div>
          <label className="text-sm text-white/60 block mb-2">
            Movement Sensitivity: <span className="text-white font-semibold">{settings.movementSensitivity}</span>
          </label>
          <input
            type="range" min={1} max={5} step={1}
            value={settings.movementSensitivity}
            onChange={e => setSettings(s => ({ ...s, movementSensitivity: Number(e.target.value) }))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>Low (less sensitive)</span>
            <span>High (more sensitive)</span>
          </div>
        </div>
      </Section>

      {/* Audio alerts */}
      <Section title="Audio Alerts">
        <Toggle
          label="Play beep sounds"
          checked={settings.audioAlertsEnabled}
          onChange={v => setSettings(s => ({ ...s, audioAlertsEnabled: v }))}
        />
        <Toggle
          label="Voice announcements"
          hint="Uses browser Speech Synthesis API"
          checked={settings.voiceAnnouncementsEnabled}
          onChange={v => setSettings(s => ({ ...s, voiceAnnouncementsEnabled: v }))}
        />
        <div>
          <label className="text-sm text-white/60 block mb-2">
            Alert Volume: <span className="text-white font-semibold">{Math.round(settings.alertVolume * 100)}%</span>
          </label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={settings.alertVolume}
            onChange={e => setSettings(s => ({ ...s, alertVolume: Number(e.target.value) }))}
            className="w-full accent-blue-500"
          />
        </div>
      </Section>

      {/* What to track */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06] space-y-6">
        <div>
          <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">What to Track</h4>
          <p className="text-xs text-white/30">Toggle individual detections on or off. Disabled events are silenced — no alerts, no log entries, no analytics.</p>
        </div>

        {GROUPS.map(group => {
          const groupEvents = (Object.entries(EVENT_META) as [EventType, typeof EVENT_META[EventType]][])
            .filter(([, m]) => m.group === group);
          return (
            <div key={group}>
              <p className="text-xs text-white/50 font-semibold uppercase tracking-wider mb-3">{group}</p>
              <div className="space-y-2">
                {groupEvents.map(([type, meta]) => {
                  const severity = EVENT_SEVERITY[type];
                  const enabled = settings.enabledDetections[type] ?? true;
                  return (
                    <div
                      key={type}
                      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border transition-all ${
                        enabled
                          ? 'bg-white/[0.04] border-white/[0.08]'
                          : 'bg-white/[0.01] border-white/[0.04] opacity-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-white">{meta.label}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${SEVERITY_BADGE[severity]}`}>
                            {severity}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">{meta.description}</p>
                      </div>
                      <button
                        onClick={() => toggleDetection(type, !enabled)}
                        className={`relative flex-shrink-0 mt-0.5 w-10 h-5 rounded-full transition-all ${enabled ? 'bg-blue-600' : 'bg-white/10'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Device selection */}
      {(videoDevices.length > 0 || audioDevices.length > 0) && (
        <Section title="Devices">
          {videoDevices.length > 0 && (
            <div>
              <label className="text-sm text-white/60 block mb-2">Camera</label>
              <select
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2"
                value={settings.videoDeviceId ?? ''}
                onChange={e => setSettings(s => ({ ...s, videoDeviceId: e.target.value || undefined }))}
              >
                <option value="">Default camera</option>
                {videoDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId.slice(0, 12)}</option>
                ))}
              </select>
            </div>
          )}
          {audioDevices.length > 0 && (
            <div>
              <label className="text-sm text-white/60 block mb-2">Microphone</label>
              <select
                className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2"
                value={settings.audioDeviceId ?? ''}
                onChange={e => setSettings(s => ({ ...s, audioDeviceId: e.target.value || undefined }))}
              >
                <option value="">Default microphone</option>
                {audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId.slice(0, 12)}</option>
                ))}
              </select>
            </div>
          )}
        </Section>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all text-sm"
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.06] space-y-4">
      <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">{title}</h4>
      {children}
    </div>
  );
}

function LabeledInput({
  label, hint, value, onChange, type = 'text', min, max,
}: {
  label: string;
  hint?: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-sm text-white/60 block mb-1">{label}</label>
      {hint && <p className="text-xs text-white/30 mb-2">{hint}</p>}
      <input
        type={type}
        min={min} max={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
      />
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white/70">{label}</p>
        {hint && <p className="text-xs text-white/30">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all ${checked ? 'bg-blue-600' : 'bg-white/10'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
