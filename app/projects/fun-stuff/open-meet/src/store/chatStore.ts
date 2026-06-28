import { create } from 'zustand'
import type { ChatMessage } from '@/types'

interface ChatStore {
  messages: ChatMessage[]
  unreadCount: number
  addMessage: (msg: ChatMessage) => void
  markRead: () => void
  clear: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  unreadCount: 0,

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
      unreadCount: state.unreadCount + 1,
    })),

  markRead: () => set({ unreadCount: 0 }),

  clear: () => set({ messages: [], unreadCount: 0 }),
}))
