# OpenMeet

Open-source Google Meet–style video calling built with WebRTC, React, and Firebase (signaling only).

No backend. No authentication. No cloud functions. Firebase is a temporary bulletin board — once peers connect, it's done.

---

## Architecture

```
Browser A                        Firebase                        Browser B
─────────                        ────────                        ─────────
  │                                  │                                │
  │──── createRoom(roomId) ─────────>│                                │
  │──── setOffer(sdp) ──────────────>│                                │
  │──── addIceCandidate(offer) ─────>│                                │
  │                                  │<──── listenForOffer ───────────│
  │                                  │<──── setAnswer(sdp) ───────────│
  │                                  │<──── addIceCandidate(answer) ──│
  │<──── listenForAnswer ────────────│                                │
  │                                  │                                │
  │ setRemoteDescription(answer)     │                                │
  │                                  │                                │
  │────────────── deleteSignaling ──>│                                │
  │                                  │                                │
  │<══════════ RTCPeerConnection (direct P2P) ════════════════════════│
  │                    (all further traffic)                          │
```

---

## WebRTC Connection Flow

1. **Host** opens `/meet/<roomId>` → creates Firestore room doc → creates SDP offer → writes to `rooms/{id}/signals/offer` → trickles ICE candidates
2. **Guest** opens same URL → reads offer → creates SDP answer → writes to `rooms/{id}/signals/answer` → trickles ICE candidates
3. **Host** reads answer → `setRemoteDescription` → connection established
4. **Both** delete all signaling documents from Firestore
5. **All communication** (chat, presence, reactions, hand raise) flows over `RTCDataChannel`

---

## Firestore Schema

```
rooms/
  {roomId}/
    createdAt: number
    updatedAt: number
    hostId: string
    participantCount: number
    status: "waiting" | "active" | "ended"

    signals/
      offer/     { sdp, offerId, timestamp }
      answer/    { sdp, answerId, timestamp }
      iceCandidates/
        offer/   { candidate, sdpMid, sdpMLineIndex, side, timestamp }[]
        answer/  { candidate, sdpMid, sdpMLineIndex, side, timestamp }[]
```

→ Full schema: [`firebase/schema.md`](./firebase/schema.md)

---

## DataChannel Protocol

After connection, everything flows over two channels:

| Channel | Messages |
|---------|----------|
| `meta`  | `presence`, `mediaState`, `handRaise`, `reaction`, `leave`, `ping` |
| `chat`  | `chat` |

Message shape: `{ type: string, payload: object }` — JSON serialized.

---

## Features

- **Camera** — on/off, device selector, mirror mode
- **Microphone** — mute/unmute, device selector
- **Screen share** — hot-swap without reconnecting
- **Chat** — RTCDataChannel only, disappears when call ends
- **Participants panel** — name, camera/mic state, speaking indicator
- **Raise hand** — broadcast to all peers
- **Emoji reactions** — 8 emojis, floating animation
- **Copy meeting link**
- **Auto-reconnect** on connection failure
- **Toast notifications**
- **Dark theme**
- **Responsive** — desktop, tablet, mobile

---

## Project Structure

```
src/
  types/          shared TypeScript types
  firebase/       Firebase init + pure Firestore signaling functions
  rtc/            WebRTC core (MediaManager, SignalingManager, PeerManager, ConnectionManager, DataChannelManager)
  store/          Zustand stores (meeting, participants, chat, media, ui)
  hooks/          React hooks wrapping RTC + media + stores
  components/
    Video/        VideoTile, VideoGrid
    Controls/     ControlBar + all buttons
    Chat/         ChatPanel
    Participants/ ParticipantsPanel
    Common/       Toast, DeviceSelector, EmojiReaction, Spinner, CopyLinkButton
  pages/          Home, Meeting
firebase/
  firestore.rules     Firestore security rules
  firestore.indexes.json
  schema.md           Full schema documentation
```

---

## Development Setup

### 1. Firebase project

Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com):

- Enable **Firestore** (Native mode)
- Copy your web app config

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in your Firebase config values.

### 3. Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in two separate browser windows or tabs.

---

## Deployment

The app is a static SPA — deploy anywhere:

```bash
npm run build
# dist/ folder contains the static site
```

**Netlify / Vercel**: set env vars in project settings, deploy `dist/`.

**SPA routing**: add a redirect rule so all paths serve `index.html`.

Example `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Limitations

- **2-person only** — current mesh topology supports one peer connection. Extending to N peers requires refactoring `ConnectionManager` into a full mesh (N×(N-1)/2 connections) or migrating to an SFU (mediasoup, Livekit).
- **No TURN server** — peers behind symmetric NAT may fail to connect. Add a TURN server to the ICE config in `PeerManager.ts`.
- **No persistence** — chat, reactions, and participant history disappear when the call ends. By design.
- **HTTPS required** — `getUserMedia` requires a secure context.

---

## Future Enhancements

- [ ] TURN server support for NAT traversal
- [ ] N-party mesh / SFU integration (mediasoup, Livekit)
- [ ] Recording (MediaRecorder API)
- [ ] AI captions (Web Speech API or Whisper)
- [ ] Whiteboard (DataChannel + Canvas)
- [ ] File transfer (DataChannel)
- [ ] Breakout rooms
- [ ] Virtual backgrounds (MediaStream + Canvas)
