import { create } from 'zustand'
import type { Toast, ToastType, EmojiReaction } from '@/types'

interface UIStore {
  isChatOpen: boolean
  isParticipantsOpen: boolean
  isFullscreen: boolean
  toasts: Toast[]
  reactions: EmojiReaction[]

  toggleChat: () => void
  toggleParticipants: () => void
  setFullscreen: (v: boolean) => void
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  addReaction: (r: EmojiReaction) => void
  removeReaction: (id: string) => void
}

const genId = () => Math.random().toString(36).slice(2, 9)

export const useUIStore = create<UIStore>((set) => ({
  isChatOpen: false,
  isParticipantsOpen: false,
  isFullscreen: false,
  toasts: [],
  reactions: [],

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen, isParticipantsOpen: false })),
  toggleParticipants: () =>
    set((s) => ({ isParticipantsOpen: !s.isParticipantsOpen, isChatOpen: false })),
  setFullscreen: (v) => set({ isFullscreen: v }),

  addToast: (message, type = 'info', duration = 3500) => {
    const id = genId()
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  addReaction: (r) => {
    set((s) => ({ reactions: [...s.reactions, r] }))
    setTimeout(() => {
      set((s) => ({ reactions: s.reactions.filter((x) => x.id !== r.id) }))
    }, 3000)
  },

  removeReaction: (id) => set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })),
}))
