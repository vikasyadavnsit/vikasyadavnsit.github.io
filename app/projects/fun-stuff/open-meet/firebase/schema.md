# Firestore Schema — OpenMeet

Firebase is used **only** as a temporary WebRTC signaling bulletin board.
All signaling documents are deleted immediately after peer connection succeeds.

---

## Collection: `rooms`

```
rooms/
  {roomId}/           ← e.g. "brave-falcon-4821"
    createdAt: number       (unix ms)
    updatedAt: number       (unix ms)
    hostId: string          (random UUID for the host peer)
    participantCount: number
    status: "waiting" | "active" | "ended"

    signals/            ← sub-collection (temporary)
      offer/            ← document
        sdp: string
        offerId: string
        timestamp: number

      answer/           ← document
        sdp: string
        answerId: string
        timestamp: number

      iceCandidates/
        offer/          ← sub-collection (candidates from offerer)
          {autoId}/
            candidate: string
            sdpMid: string | null
            sdpMLineIndex: number | null
            side: "offer"
            timestamp: number

        answer/         ← sub-collection (candidates from answerer)
          {autoId}/
            candidate: string
            sdpMid: string | null
            sdpMLineIndex: number | null
            side: "answer"
            timestamp: number
```

---

## Lifecycle

1. **Host joins** → writes `rooms/{roomId}` document
2. **Host creates offer** → writes `rooms/{roomId}/signals/offer`
3. **Host trickles ICE** → appends to `rooms/{roomId}/signals/iceCandidates/offer/`
4. **Guest reads offer** → creates answer → writes `rooms/{roomId}/signals/answer`
5. **Guest trickles ICE** → appends to `rooms/{roomId}/signals/iceCandidates/answer/`
6. **Host reads answer** → connection established
7. **Both sides delete signaling docs** → Firebase traffic stops
8. **Everything else** (chat, presence, reactions) flows over RTCDataChannel
9. **Last participant leaves** → `rooms/{roomId}` deleted

---

## What is NOT stored in Firestore

- Chat messages
- Participant names / states
- Presence / online status
- Emoji reactions
- Raised hands
- Media stream data
- Any post-connection state

---

## Rules summary

- Public read on room doc (to check if room exists)
- Write only to own signaling paths
- Deny all other writes
