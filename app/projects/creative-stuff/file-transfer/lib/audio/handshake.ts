// Full audio-mode protocol: tone handshake -> single-pass broadcast -> bounded
// selective resend-by-index rounds. See the plan's step-by-step sequence.

import type { AudioSession, ToneEvent } from "./demodulator";
import { ToneDetector } from "./demodulator";
import { playTone, playSymbols } from "./modulator";
import {
  HANDSHAKE_READY_HZ,
  HANDSHAKE_ACK_HZ,
  END_OF_TRANSMISSION_HZ,
} from "./toneMap";
import {
  encodeManifestSymbols,
  encodeChunkSymbols,
  encodeResendSymbols,
  decodeResendIndices,
  FrameDecoder,
  type DecodedFrame,
} from "./audioFraming";
import {
  encodeManifestFrame,
  encodeChunkFrame,
  decodeManifestFrame,
  decodeChunkFrame,
  reassemble,
  ReassemblyError,
  type Manifest,
  type ChunkFrame,
} from "../chunking";

const MAX_RESEND_ROUNDS = 3;
const HANDSHAKE_TIMEOUT_MS = 30000;
const FRAME_INACTIVITY_TIMEOUT_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AudioLink {
  private detector: ToneDetector;
  private listeners: Array<(e: ToneEvent) => void> = [];

  constructor(session: AudioSession) {
    this.detector = new ToneDetector(session, (e) => {
      for (const l of this.listeners) l(e);
    });
  }

  start() {
    this.detector.start();
  }

  stop() {
    this.detector.stop();
  }

  onEvent(fn: (e: ToneEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}

// Absolute timeout — used only where real (possibly long) silence is expected
// while waiting for the other device to even begin, so we don't want ambient
// noise blips resetting the clock indefinitely.
function waitForControlTone(link: AudioLink, freq: number, timeoutMs: number, requiredCount = 1): Promise<boolean> {
  return new Promise((resolve) => {
    let count = 0;
    let off: () => void = () => {};
    const timer = setTimeout(() => {
      off();
      resolve(false);
    }, timeoutMs);
    off = link.onEvent((e) => {
      if (e.type === "control" && e.freq === freq) {
        count++;
        if (count >= requiredCount) {
          clearTimeout(timer);
          off();
          resolve(true);
        }
      }
    });
  });
}

// Inactivity timeout — resets on every event, since a frame legitimately takes
// many seconds of continuous symbol traffic to fully arrive; only genuine
// silence (nothing at all for `inactivityTimeoutMs`) should give up.
function waitForFrame(link: AudioLink, decoder: FrameDecoder, inactivityTimeoutMs: number): Promise<DecodedFrame | null> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    let off: () => void = () => {};
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        off();
        resolve(null);
      }, inactivityTimeoutMs);
    };
    resetTimer();
    off = link.onEvent((e) => {
      resetTimer();
      const frame = decoder.handleEvent(e);
      if (frame) {
        clearTimeout(timer);
        off();
        resolve(frame);
      }
    });
  });
}

export type SenderState =
  | "listening-for-receiver"
  | "handshaking"
  | "sending-manifest"
  | "sending-chunks"
  | "awaiting-resend"
  | "resending"
  | "done"
  | "failed";

export interface AudioSenderCallbacks {
  onStateChange: (state: SenderState) => void;
  onChunkSent: (chunkIndex: number, total: number) => void;
  onFinished: (outcome: "no-response" | "clean" | "gave-up-after-resends") => void;
}

export async function runAudioSender(
  session: AudioSession,
  manifest: Manifest,
  chunks: ChunkFrame[],
  callbacks: AudioSenderCallbacks,
): Promise<void> {
  const link = new AudioLink(session);
  link.start();
  try {
    callbacks.onStateChange("listening-for-receiver");
    const heard = await waitForControlTone(link, HANDSHAKE_READY_HZ, HANDSHAKE_TIMEOUT_MS, 2);
    if (!heard) {
      callbacks.onStateChange("failed");
      callbacks.onFinished("no-response");
      return;
    }

    callbacks.onStateChange("handshaking");
    playTone(session.ctx, HANDSHAKE_ACK_HZ, 300);
    await sleep(500);

    callbacks.onStateChange("sending-manifest");
    await playSymbols(session.ctx, encodeManifestSymbols(encodeManifestFrame(manifest)));

    callbacks.onStateChange("sending-chunks");
    for (const c of chunks) {
      const raw = encodeChunkFrame(c.transferId, c.chunkIndex, c.payload);
      await playSymbols(session.ctx, encodeChunkSymbols(raw));
      callbacks.onChunkSent(c.chunkIndex, chunks.length);
    }
    playTone(session.ctx, END_OF_TRANSMISSION_HZ, 300);
    await sleep(400);

    for (let round = 0; round < MAX_RESEND_ROUNDS; round++) {
      callbacks.onStateChange("awaiting-resend");
      const decoder = new FrameDecoder();
      const frame = await waitForFrame(link, decoder, 15000);

      if (!frame || frame.kind !== "resend") {
        callbacks.onStateChange("done");
        callbacks.onFinished("clean");
        return;
      }

      const missingIndices = new Set(decodeResendIndices(frame.bytes));
      const toResend = chunks.filter((c) => missingIndices.has(c.chunkIndex));

      callbacks.onStateChange("resending");
      for (const c of toResend) {
        const raw = encodeChunkFrame(c.transferId, c.chunkIndex, c.payload);
        await playSymbols(session.ctx, encodeChunkSymbols(raw));
        callbacks.onChunkSent(c.chunkIndex, chunks.length);
      }
      playTone(session.ctx, END_OF_TRANSMISSION_HZ, 300);
      await sleep(400);
    }

    callbacks.onStateChange("failed");
    callbacks.onFinished("gave-up-after-resends");
  } finally {
    link.stop();
  }
}

export type ReceiverState =
  | "beaconing"
  | "awaiting-manifest"
  | "receiving"
  | "requesting-resend"
  | "done"
  | "failed";

export interface AudioReceiverCallbacks {
  onStateChange: (state: ReceiverState) => void;
  onManifest: (m: Manifest) => void;
  onChunkResult: (chunkIndex: number, ok: boolean) => void;
  onFinished: (result: { success: boolean; manifest?: Manifest; bytes?: Uint8Array; error?: string }) => void;
}

export async function runAudioReceiver(session: AudioSession, callbacks: AudioReceiverCallbacks): Promise<void> {
  const link = new AudioLink(session);
  link.start();
  try {
    callbacks.onStateChange("beaconing");
    let beaconTimer: ReturnType<typeof setTimeout> | null = null;
    const beaconLoop = () => {
      playTone(session.ctx, HANDSHAKE_READY_HZ, 200);
      beaconTimer = setTimeout(beaconLoop, 500);
    };
    beaconLoop();

    const ackHeard = await waitForControlTone(link, HANDSHAKE_ACK_HZ, HANDSHAKE_TIMEOUT_MS, 1);
    if (beaconTimer) clearTimeout(beaconTimer);
    if (!ackHeard) {
      callbacks.onStateChange("failed");
      callbacks.onFinished({ success: false, error: "No sender detected — check both devices are listening." });
      return;
    }

    callbacks.onStateChange("awaiting-manifest");
    const decoder = new FrameDecoder();
    let manifest: Manifest | null = null;

    while (!manifest) {
      const frame = await waitForFrame(link, decoder, FRAME_INACTIVITY_TIMEOUT_MS);
      if (!frame) {
        callbacks.onStateChange("failed");
        callbacks.onFinished({ success: false, error: "Timed out waiting for file info." });
        return;
      }
      if (frame.kind === "manifest") {
        manifest = decodeManifestFrame(frame.bytes);
        if (manifest) callbacks.onManifest(manifest);
      }
    }

    const chunkMap = new Map<number, Uint8Array>();

    const receiveUntilEnd = async () => {
      let ended = false;
      const off = link.onEvent((e) => {
        if (e.type === "control" && e.freq === END_OF_TRANSMISSION_HZ) ended = true;
      });
      try {
        while (!ended) {
          const frame = await waitForFrame(link, decoder, FRAME_INACTIVITY_TIMEOUT_MS);
          if (!frame) break; // real silence — stop waiting, move on to missing-chunk check
          if (frame.kind === "chunk") {
            const decoded = decodeChunkFrame(frame.bytes);
            if (decoded) {
              if (decoded.crcValid) chunkMap.set(decoded.chunkIndex, decoded.payload);
              callbacks.onChunkResult(decoded.chunkIndex, decoded.crcValid);
            }
          }
        }
      } finally {
        off();
      }
    };

    callbacks.onStateChange("receiving");
    await receiveUntilEnd();

    const missing = () => {
      const out: number[] = [];
      for (let i = 0; i < (manifest as Manifest).chunkCount; i++) if (!chunkMap.has(i)) out.push(i);
      return out;
    };

    for (let round = 0; round < MAX_RESEND_ROUNDS && missing().length > 0; round++) {
      callbacks.onStateChange("requesting-resend");
      await sleep(300);
      await playSymbols(session.ctx, encodeResendSymbols(missing()));
      callbacks.onStateChange("receiving");
      await receiveUntilEnd();
    }

    const stillMissing = missing();
    if (stillMissing.length === 0) {
      try {
        const bytes = await reassemble(manifest, chunkMap);
        callbacks.onStateChange("done");
        callbacks.onFinished({ success: true, manifest, bytes });
      } catch (e) {
        callbacks.onStateChange("failed");
        callbacks.onFinished({
          success: false,
          manifest,
          error: e instanceof ReassemblyError ? e.message : "Reassembly failed.",
        });
      }
    } else {
      callbacks.onStateChange("failed");
      callbacks.onFinished({
        success: false,
        manifest,
        error: `${stillMissing.length} of ${manifest.chunkCount} chunk(s) could not be delivered.`,
      });
    }
  } finally {
    link.stop();
  }
}
