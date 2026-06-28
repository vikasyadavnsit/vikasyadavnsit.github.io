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

const generateId = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const useMeetingStore = create<MeetingStore>((set) => ({
  roomId: null,
  localParticipantId: generateId(),
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
