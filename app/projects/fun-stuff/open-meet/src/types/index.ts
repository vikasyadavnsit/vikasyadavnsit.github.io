// ─── Participant ─────────────────────────────────────────────────────────────

export interface Participant {
  id: string
  name: string
  isCameraOn: boolean
  isMicOn: boolean
  isSpeaking: boolean
  isHandRaised: boolean
  stream?: MediaStream
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
}

// ─── DataChannel messages ─────────────────────────────────────────────────────

export type DataChannelMessage =
  | { type: 'chat'; payload: ChatMessage }
  | { type: 'presence'; payload: { participant: Participant } }
  | { type: 'mediaState'; payload: { senderId: string; isCameraOn: boolean; isMicOn: boolean } }
  | { type: 'handRaise'; payload: { senderId: string; isRaised: boolean } }
  | { type: 'reaction'; payload: { senderId: string; emoji: string } }
  | { type: 'leave'; payload: { senderId: string } }
  | { type: 'ping'; payload: { senderId: string } }

// ─── Signaling ───────────────────────────────────────────────────────────────

export interface RoomDoc {
  createdAt: number
  updatedAt: number
  hostId: string
  participantCount: number
  status: 'waiting' | 'active' | 'ended'
}

export interface SignalOffer {
  sdp: string
  offerId: string
  timestamp: number
}

export interface SignalAnswer {
  sdp: string
  answerId: string
  timestamp: number
}

export interface SignalIceCandidate {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
  side: 'offer' | 'answer'
  timestamp: number
}

// ─── Media devices ────────────────────────────────────────────────────────────

export interface DeviceInfo {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

// ─── Meeting status ───────────────────────────────────────────────────────────

export type MeetingStatus =
  | 'idle'
  | 'joining'
  | 'waiting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error'

export type ConnectionStatus =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed'

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

// ─── Emoji reactions ──────────────────────────────────────────────────────────

export interface EmojiReaction {
  id: string
  senderId: string
  senderName: string
  emoji: string
  timestamp: number
}
