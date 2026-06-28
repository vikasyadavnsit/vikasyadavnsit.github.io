import { create } from 'zustand'
import type { MeetingStatus } from '@/types'

interface MeetingStore {
  roomId: string | null
  localParticipantId: string
  localName: string
  isHost: boolean
  status: MeetingStatus

  setRoomId: (id: string) => void
  setLocalName: (name: string) => void
  setIsHost: (v: boolean) => void
  setStatus: (s: MeetingStatus) => void
  reset: () => void
}

// Persist the participant ID across browser refreshes so we can reclaim our
// host role after reloading (the room doc's hostId is matched against this).
const getOrCreateParticipantId = (): string => {
  try {
    const stored = sessionStorage.getItem('om_participant_id')
    if (stored) return stored
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    sessionStorage.setItem('om_participant_id', id)
    return id
  } catch {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  }
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  roomId: null,
  localParticipantId: getOrCreateParticipantId(),
  localName: `Guest-${Math.floor(Math.random() * 9000 + 1000)}`,
  isHost: false,
  status: 'idle',

  setRoomId: (id) => set({ roomId: id }),
  setLocalName: (name) => set({ localName: name }),
  setIsHost: (v) => set({ isHost: v }),
  setStatus: (s) => set({ status: s }),
  reset: () =>
    set({
      roomId: null,
      isHost: false,
      status: 'idle',
    }),
}))
