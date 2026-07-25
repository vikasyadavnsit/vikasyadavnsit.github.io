// AnalyserNode + rAF envelope detection — same architectural shape as the QR
// receiver's scan loop, deliberately avoiding an AudioWorklet module (which
// under static export would need its own basePath-prefixed asset URL).

import { ALL_TONES, CONTROL_TONES, GROUP_A, GROUP_B } from "./toneMap";

const ON_THRESHOLD_DB = 20; // magnitude above rolling noise floor to count as "on"
const MIN_ON_TICKS = 2; // debounce: ignore blips shorter than ~2 rAF ticks

export interface AudioSession {
  ctx: AudioContext;
  analyser: AnalyserNode;
  freqData: Float32Array<ArrayBuffer>;
  stream: MediaStream;
}

export async function createAudioSession(): Promise<AudioSession> {
  const ctx = new AudioContext();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.05;
  source.connect(analyser);
  const freqData = new Float32Array(analyser.frequencyBinCount);
  return { ctx, analyser, freqData, stream };
}

export function closeAudioSession(session: AudioSession) {
  session.stream.getTracks().forEach((t) => t.stop());
  void session.ctx.close();
}

export type ToneEvent = { type: "control"; freq: number } | { type: "nibble"; value: number };

function binIndexFor(freq: number, sampleRate: number, fftSize: number): number {
  return Math.round((freq * fftSize) / sampleRate);
}

export class ToneDetector {
  private rafId = 0;
  private state: "idle" | "on" = "idle";
  private hits = new Map<number, number>();
  private onTicks = 0;
  private noiseFloor = -100;
  private bins: Map<number, number>;

  constructor(private session: AudioSession, private onEvent: (e: ToneEvent) => void) {
    this.bins = new Map(ALL_TONES.map((f) => [f, binIndexFor(f, session.ctx.sampleRate, session.analyser.fftSize)]));
  }

  start() {
    const tick = () => {
      this.session.analyser.getFloatFrequencyData(this.session.freqData);
      const mags = new Map<number, number>();
      for (const [freq, bin] of this.bins) {
        mags.set(freq, this.session.freqData[bin] ?? -100);
      }
      const maxMag = Math.max(...mags.values());

      if (this.state === "idle") {
        const avg = [...mags.values()].reduce((a, b) => a + b, 0) / mags.size;
        this.noiseFloor = this.noiseFloor * 0.9 + avg * 0.1;
        if (maxMag - this.noiseFloor > ON_THRESHOLD_DB) {
          this.state = "on";
          this.hits = new Map();
          this.onTicks = 0;
        }
      } else {
        this.onTicks++;
        for (const [freq, mag] of mags) {
          if (mag - this.noiseFloor > ON_THRESHOLD_DB) {
            this.hits.set(freq, (this.hits.get(freq) ?? 0) + 1);
          }
        }
        if (maxMag - this.noiseFloor <= ON_THRESHOLD_DB) {
          this.finalize();
          this.state = "idle";
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }

  private finalize() {
    if (this.onTicks < MIN_ON_TICKS) return;

    let bestControl: number | null = null;
    let bestControlHits = 0;
    for (const f of CONTROL_TONES) {
      const h = this.hits.get(f) ?? 0;
      if (h > bestControlHits) {
        bestControlHits = h;
        bestControl = f;
      }
    }

    let bestA: number | null = null;
    let bestAHits = 0;
    for (const f of GROUP_A) {
      const h = this.hits.get(f) ?? 0;
      if (h > bestAHits) {
        bestAHits = h;
        bestA = f;
      }
    }

    let bestB: number | null = null;
    let bestBHits = 0;
    for (const f of GROUP_B) {
      const h = this.hits.get(f) ?? 0;
      if (h > bestBHits) {
        bestBHits = h;
        bestB = f;
      }
    }

    if (bestA !== null && bestB !== null && bestAHits + bestBHits >= bestControlHits) {
      const nibble = (GROUP_A.indexOf(bestA) << 2) | GROUP_B.indexOf(bestB);
      this.onEvent({ type: "nibble", value: nibble });
    } else if (bestControl !== null) {
      this.onEvent({ type: "control", freq: bestControl });
    }
  }
}
