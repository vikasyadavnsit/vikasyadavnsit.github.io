import { create } from 'zustand'
import type { Participant } from '@/types'

interface ParticipantsStore {
  participants: Map<string, Participant>
  add: (p: Participant) => void
  update: (id: string, patch: Partial<Participant>) => void
  remove: (id: string) => void
  clear: () => void
  list: () => Participant[]
}

export const useParticipantsStore = create<ParticipantsStore>((set, get) => ({
  participants: new Map(),

  add: (p) =>
    set((state) => {
      const next = new Map(state.participants)
      next.set(p.id, p)
      return { participants: next }
    }),

  update: (id, patch) =>
    set((state) => {
      const next = new Map(state.participants)
      const existing = next.get(id)
      if (existing) next.set(id, { ...existing, ...patch })
      return { participants: next }
    }),

  remove: (id) =>
    set((state) => {
      const next = new Map(state.participants)
      next.delete(id)
      return { participants: next }
    }),

  clear: () => set({ participants: new Map() }),

  list: () => Array.from(get().participants.values()),
}))
