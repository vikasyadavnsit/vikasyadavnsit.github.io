import { useMemo } from 'react'
import { useParticipantsStore } from '@/store/participantsStore'
import { useMeetingStore } from '@/store/meetingStore'
import type { Participant } from '@/types'

export function useParticipants() {
  const participants = useParticipantsStore((s) => s.participants)
  const { localParticipantId, localName } = useMeetingStore()

  const list = useMemo(() => Array.from(participants.values()), [participants])

  const remoteParticipants = useMemo(
    () => list.filter((p) => p.id !== localParticipantId),
    [list, localParticipantId],
  )

  const localParticipant = useMemo(
    (): Participant => ({
      id: localParticipantId,
      name: localName,
      isCameraOn: true,
      isMicOn: true,
      isSpeaking: false,
      isHandRaised: false,
    }),
    [localParticipantId, localName],
  )

  return { list, remoteParticipants, localParticipant, count: list.length + 1 }
}
