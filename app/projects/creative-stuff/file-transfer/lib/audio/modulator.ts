// Schedules OscillatorNode bursts against AudioContext.currentTime rather than
// setTimeout — setTimeout-driven scheduling introduces tens-of-ms jitter that
// would break the amplitude-envelope timing the demodulator relies on.

import { SYMBOL_ON_MS, SYMBOL_GAP_MS, nibbleToGroupFreqs } from "./toneMap";

// Control/handshake tones play as a single oscillator, so they can run louder
// without risk of clipping. Data symbols sound two oscillators at once
// (Group A + Group B) — their peaks sum, so each is kept lower to stay
// comfortably under 1.0 combined (worst case 0.45+0.45=0.9) while still being
// noticeably louder than the original single-tone-equivalent 0.3.
const CONTROL_TONE_GAIN = 0.7;
const DATA_TONE_GAIN = 0.45;
const RAMP_SEC = 0.005; // quick fade in/out to avoid clicks/pops

function scheduleOsc(ctx: AudioContext, freq: number, startTime: number, durationSec: number, peakGain: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + RAMP_SEC);
  gain.gain.setValueAtTime(peakGain, Math.max(startTime + RAMP_SEC, startTime + durationSec - RAMP_SEC));
  gain.gain.linearRampToValueAtTime(0, startTime + durationSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + durationSec + 0.01);
}

// Fire-and-forget single tone, used for handshake beacons/acks and standalone
// control tones (End-of-Transmission, etc).
export function playTone(ctx: AudioContext, freq: number, durationMs: number, startTime?: number): number {
  const start = startTime ?? ctx.currentTime + 0.02;
  scheduleOsc(ctx, freq, start, durationMs / 1000, CONTROL_TONE_GAIN);
  return start + durationMs / 1000;
}

export type EncodedSymbol = { kind: "tone"; freq: number } | { kind: "nibble"; value: number };

// Schedules a full symbol sequence back-to-back and resolves once playback
// should be finished (real-time wait, not audio-graph-precise, but nothing
// downstream depends on sub-frame timing after scheduling completes).
export function playSymbols(ctx: AudioContext, symbols: EncodedSymbol[]): Promise<void> {
  const onSec = SYMBOL_ON_MS / 1000;
  const gapSec = SYMBOL_GAP_MS / 1000;
  let t = ctx.currentTime + 0.05;
  const firstStart = t;

  for (const s of symbols) {
    if (s.kind === "tone") {
      scheduleOsc(ctx, s.freq, t, onSec, CONTROL_TONE_GAIN);
    } else {
      const [a, b] = nibbleToGroupFreqs(s.value);
      scheduleOsc(ctx, a, t, onSec, DATA_TONE_GAIN);
      scheduleOsc(ctx, b, t, onSec, DATA_TONE_GAIN);
    }
    t += onSec + gapSec;
  }

  const totalMs = (t - firstStart) * 1000;
  return new Promise((resolve) => setTimeout(resolve, totalMs + 80));
}
