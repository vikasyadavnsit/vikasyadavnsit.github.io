import { useCallback } from 'react'
import { useParticipantsStore } from '@/store/participantsStore'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import type { DataChannelMessage, EmojiReaction } from '@/types'

export function useDataChannel(sendMessage?: (msg: DataChannelMessage) => void) {
  const { update: updateParticipant, remove: removeParticipant } = useParticipantsStore()
  const addChatMessage = useChatStore((s) => s.addMessage)
  const { addReaction, addToast } = useUIStore()

  const handleIncoming = useCallback(
    (message: DataChannelMessage) => {
      switch (message.type) {
        case 'presence':
          // handled by useParticipants
          break

        case 'chat':
          addChatMessage(message.payload)
          break

        case 'mediaState':
          updateParticipant(message.payload.senderId, {
            isCameraOn: message.payload.isCameraOn,
            isMicOn: message.payload.isMicOn,
          })
          break

        case 'handRaise':
          updateParticipant(message.payload.senderId, {
            isHandRaised: message.payload.isRaised,
          })
          if (message.payload.isRaised) {
            const participants = useParticipantsStore.getState().participants
            const p = participants.get(message.payload.senderId)
            if (p) addToast(`${p.name} raised their hand ✋`, 'info')
          }
          break

        case 'reaction': {
          const participants = useParticipantsStore.getState().participants
          const p = participants.get(message.payload.senderId)
          const reaction: EmojiReaction = {
            id: Math.random().toString(36).slice(2),
            senderId: message.payload.senderId,
            senderName: p?.name ?? 'Someone',
            emoji: message.payload.emoji,
            timestamp: Date.now(),
          }
          addReaction(reaction)
          break
        }

        case 'leave':
          removeParticipant(message.payload.senderId)
          break

        default:
          break
      }
    },
    [addChatMessage, updateParticipant, removeParticipant, addReaction, addToast],
  )

  const sendChat = useCallback(
    (text: string, senderId: string, senderName: string) => {
      const msg: DataChannelMessage = {
        type: 'chat',
        payload: {
          id: Math.random().toString(36).slice(2),
          senderId,
          senderName,
          text,
          timestamp: Date.now(),
        },
      }
      sendMessage?.(msg)
      // Also add to own store
      addChatMessage(msg.payload)
    },
    [sendMessage, addChatMessage],
  )

  const sendMediaState = useCallback(
    (senderId: string, isCameraOn: boolean, isMicOn: boolean) => {
      sendMessage?.({ type: 'mediaState', payload: { senderId, isCameraOn, isMicOn } })
    },
    [sendMessage],
  )

  const sendHandRaise = useCallback(
    (senderId: string, isRaised: boolean) => {
      sendMessage?.({ type: 'handRaise', payload: { senderId, isRaised } })
    },
    [sendMessage],
  )

  const sendReaction = useCallback(
    (senderId: string, emoji: string) => {
      sendMessage?.({ type: 'reaction', payload: { senderId, emoji } })
    },
    [sendMessage],
  )

  const sendLeave = useCallback(
    (senderId: string) => {
      sendMessage?.({ type: 'leave', payload: { senderId } })
    },
    [sendMessage],
  )

  return { handleIncoming, sendChat, sendMediaState, sendHandRaise, sendReaction, sendLeave }
}
