import type { AlertSeverity, EventType } from '../types';

// Per-event debounce: same event type can voice-alert at most once per 30s
const lastSpokenAt: Partial<Record<EventType, number>> = {};
const SPEAK_DEBOUNCE_MS = 30_000;

export function speak(message: string, severity: AlertSeverity, eventType: EventType): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const now = Date.now();
  const last = lastSpokenAt[eventType] ?? 0;
  if (now - last < SPEAK_DEBOUNCE_MS) return;
  lastSpokenAt[eventType] = now;

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(message);
  utt.volume = 1;
  switch (severity) {
    case 'CRITICAL':
      utt.rate = 1.1;
      utt.pitch = 1.2;
      break;
    case 'WARNING':
      utt.rate = 1.0;
      utt.pitch = 1.0;
      break;
    case 'INFO':
      utt.rate = 0.9;
      utt.pitch = 0.9;
      break;
  }
  window.speechSynthesis.speak(utt);
}

export function playBeep(severity: AlertSeverity): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (severity) {
      case 'CRITICAL':
        osc.frequency.value = 880;
        gain.gain.value = 0.4;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          osc2.connect(gain);
          osc2.frequency.value = 1100;
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.3);
          setTimeout(() => ctx.close(), 400);
        }, 350);
        break;
      case 'WARNING':
        osc.frequency.value = 660;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        setTimeout(() => ctx.close(), 300);
        break;
      case 'INFO':
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        setTimeout(() => ctx.close(), 200);
        break;
    }
  } catch {
    // AudioContext unavailable — silent fallback
  }
}
