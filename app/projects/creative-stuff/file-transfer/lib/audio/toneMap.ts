// DTMF-like dual-group tone scheme. One tone from Group A + one from Group B
// sounded together = 1 of 16 combinations = 1 nibble per symbol. Control tones
// are single frequencies used for handshake and frame framing. All gaps are
// >=150Hz apart to keep detection bins from bleeding into each other.

export const HANDSHAKE_READY_HZ = 700;
export const HANDSHAKE_ACK_HZ = 850;

export const SYNC_MANIFEST_HZ = 2900;
export const SYNC_CHUNK_HZ = 3100;
export const END_OF_FRAME_HZ = 3300;
export const END_OF_TRANSMISSION_HZ = 3500;
export const SYNC_RESEND_REQUEST_HZ = 3700;

export const CONTROL_TONES = [
  HANDSHAKE_READY_HZ,
  HANDSHAKE_ACK_HZ,
  SYNC_MANIFEST_HZ,
  SYNC_CHUNK_HZ,
  END_OF_FRAME_HZ,
  END_OF_TRANSMISSION_HZ,
  SYNC_RESEND_REQUEST_HZ,
];

export const GROUP_A = [1100, 1250, 1400, 1550];
export const GROUP_B = [2000, 2200, 2400, 2600];

export const ALL_TONES = [...CONTROL_TONES, ...GROUP_A, ...GROUP_B];

// Shortened from the initial 100/50ms split to push the raw symbol rate up
// (150ms -> 95ms/symbol, ~58% faster). Still comfortably above the analyser's
// tick resolution (fftSize 1024 @ ~16ms rAF ticks), so detection margin stays
// healthy in a quiet room — it just trades away some of the original slack.
export const SYMBOL_ON_MS = 70;
export const SYMBOL_GAP_MS = 25;

export function nibbleToGroupFreqs(nibble: number): [number, number] {
  const a = GROUP_A[(nibble >> 2) & 0b11];
  const b = GROUP_B[nibble & 0b11];
  return [a, b];
}
