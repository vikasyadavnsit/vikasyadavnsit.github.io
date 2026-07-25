# 📦 Project Catalog

A complete, per-project breakdown of every micro-app in this portfolio, grouped exactly as they appear in the live navigation: **Creative Stuff**, **Fun Stuff**, **IoT**, and **AI**.

Each project is a self-contained route under `app/projects/<category>/<slug>/`, with its own components and (in some cases) its own `layout.tsx`. Project metadata (title, description, route, icon) is defined inline in each category's listing page — there is no central CMS for projects, only for the [Blog](../README.md#-blog).

> **Screenshots:** No screenshots exist for these projects yet. Each entry below has a placeholder comment — replace the `src` in the matching `<img>` tag with a real capture from `/projects/<category>/<slug>` once available, and drop the file in `docs/images/`.

## Table of Contents

- [Creative Stuff (16)](#-creative-stuff)
- [Fun Stuff (8)](#-fun-stuff)
- [IoT (1)](#-iot)
- [AI (coming soon)](#-ai)

---

## 🎨 Creative Stuff

<div id="-creative-stuff"></div>

Productivity engines, editors, and automation tools. Route prefix: `/projects/creative-stuff/`.

### 1. Digital Whiteboard
`/projects/creative-stuff/whiteboard`

Collaborative digital whiteboard — doodle with any shape or color, organize work into shareable notebooks, with real-time state syncing.

**Tech:** Custom `<canvas>` rendering engine, Firebase Realtime Database (sync/persistence), `ThemeContext`.

<!-- SCREENSHOT: Digital Whiteboard canvas in use -->
<!-- <img src="images/project-whiteboard.png" alt="Digital Whiteboard" width="800"/> -->

### 2. Scratchpad
`/projects/creative-stuff/scratchpad`

Web-based drawing pad for mouse and touch input, with a full color palette and infinite undo/redo.

**Tech:** P5.js (loaded via `next/script`).

<!-- SCREENSHOT: Scratchpad drawing canvas -->
<!-- <img src="images/project-scratchpad.png" alt="Scratchpad" width="800"/> -->

### 3. QR-Based Remote Login
`/projects/creative-stuff/qr-login`

Log in on one device by scanning a QR code with your phone — a cross-device, cross-browser authentication handshake.

**Tech:** `jsqr` (QR decoding), Firebase Realtime Database (session handshake).

<!-- SCREENSHOT: QR login scan flow -->
<!-- <img src="images/project-qr-login.png" alt="QR Login" width="800"/> -->

### 4. Global Chat Hub
`/projects/creative-stuff/chat-application`

Real-time, ephemeral global chat/broadcast room — no accounts, just presence.

**Tech:** Firebase Realtime Database (`onDisconnect`, `serverTimestamp` for presence and ordering).

<!-- SCREENSHOT: Global Chat Hub conversation -->
<!-- <img src="images/project-chat.png" alt="Global Chat Hub" width="800"/> -->

### 5. URL Shortener
`/projects/creative-stuff/url-shortener`

Shortens URLs and stores the mapping entirely client-side — no backend required.

**Tech:** `localStorage`-backed persistence.

<!-- SCREENSHOT: URL Shortener interface -->
<!-- <img src="images/project-url-shortener.png" alt="URL Shortener" width="800"/> -->

### 6. TOTP Authenticator
`/projects/creative-stuff/totp-authenticator`

Web-based 2FA code generator — add accounts via QR scan, image upload, or manual secret key entry, with live 30-second code rotation.

**Tech:** `otpauth` (TOTP/HMAC generation), `jsqr` (QR scanning).

<!-- SCREENSHOT: TOTP Authenticator code list -->
<!-- <img src="images/project-totp.png" alt="TOTP Authenticator" width="800"/> -->

### 7. Task Manager
`/projects/creative-stuff/task-manager`

Notion-style task manager with Kanban, List, and Table views, plus a block-style editor.

**Tech:** `localStorage`-backed persistence.

<!-- SCREENSHOT: Task Manager Kanban board -->
<!-- <img src="images/project-task-manager.png" alt="Task Manager" width="800"/> -->

### 8. File Encryptor
`/projects/creative-stuff/file-encryptor`

Encrypts files in-browser with AES-256-GCM — the file never leaves the device unencrypted.

**Tech:** Web Crypto `SubtleCrypto` API.

<!-- SCREENSHOT: File Encryptor upload/encrypt flow -->
<!-- <img src="images/project-file-encryptor.png" alt="File Encryptor" width="800"/> -->

### 9. Internet Speed Test
`/projects/creative-stuff/internet-speed-test`

Measures download/upload throughput, ping, and jitter, with a historic performance chart.

**Tech:** `recharts` (historic charting).

<!-- SCREENSHOT: Internet Speed Test results and chart -->
<!-- <img src="images/project-speed-test.png" alt="Internet Speed Test" width="800"/> -->

### 10. Password Vault
`/projects/creative-stuff/password-vault`

AES-256 encrypted password manager with local key derivation and encrypted export.

**Tech:** Web Crypto API (`SubtleCrypto`, PBKDF2 key derivation).

<!-- SCREENSHOT: Password Vault entry list -->
<!-- <img src="images/project-password-vault.png" alt="Password Vault" width="800"/> -->

### 11. RequestLab
`/projects/creative-stuff/request-lab`

An in-browser API client (a Postman alternative) with request collections, folders, and cURL import/export.

**Tech:** `localStorage`-backed collection storage, native `fetch`.

<!-- SCREENSHOT: RequestLab request builder -->
<!-- <img src="images/project-request-lab.png" alt="RequestLab" width="800"/> -->

### 12. Flagbase
`/projects/creative-stuff/flagbase`

A feature-flag management platform — multi-environment flags, targeting/rollout rules, and a JS SDK snippet, with dedicated Landing, Dashboard, Project, Flag-detail, and Docs views.

**Tech:** Custom view components (`LandingView`, `DashboardView`, `ProjectView`, `FlagDetailView`, `DocsView`), `ThemeContext`.

<!-- SCREENSHOT: Flagbase dashboard -->
<!-- <img src="images/project-flagbase.png" alt="Flagbase" width="800"/> -->

### 13. Workflow Builder
`/projects/creative-stuff/workflow-builder`

A no-code visual automation engine — chain Trigger, HTTP, Transform, Notify, Code, LLM, Condition, and Delay nodes on a graph canvas and execute the flow client-side.

**Tech:** `@xyflow/react` (React Flow) for the node canvas, `IndexedDB` for persisted flow state, sandboxed `new Function()` execution for Code nodes.

<!-- SCREENSHOT: Workflow Builder node graph -->
<!-- <img src="images/project-workflow-builder.png" alt="Workflow Builder" width="800"/> -->

### 14. Algorithm Arena
`/projects/creative-stuff/algorithm-arena`

A LeetCode-style coding IDE supporting JavaScript, TypeScript, Python, Java, C++, and Go, in a custom resizable 3-pane layout with a client-side test runner.

**Tech:** Custom `ResizablePane`/`Editor` components, a regex-based transpilation layer mapping Python/Java/C++/Go idioms to executable JS, `localStorage` for code/language persistence.

<!-- SCREENSHOT: Algorithm Arena code editor -->
<!-- <img src="images/project-algorithm-arena.png" alt="Algorithm Arena" width="800"/> -->

### 15. Notable Notes
`/projects/creative-stuff/notable-notes`

Markdown note-taking with live preview, local persistence, and PDF/ZIP export.

**Tech:** `marked` (Markdown rendering), `mermaid` (diagram rendering in notes), `jszip` (export bundling).

<!-- SCREENSHOT: Notable Notes editor with live preview -->
<!-- <img src="images/project-notable-notes.png" alt="Notable Notes" width="800"/> -->

### 16. File Transfer
`/projects/creative-stuff/file-transfer`

Moves a file between two devices with **no server** — split into a sequence of QR codes read by a camera, or transmitted as audio tones with a handshake protocol. Fully local, browser-only. *(Newest addition.)*

**Tech:** QR mode via `qrcode.react` (`QRCodeSVG`, sender) and `jsqr` (scanner, receiver); Audio mode via a custom Web Audio FSK-style modulator/demodulator (`lib/audio/modulator.ts`, `lib/audio/demodulator.ts`) with a handshake protocol; `jszip` (`lib/zipBundle.ts`) to bundle multi-file transfers.

<!-- SCREENSHOT: File Transfer QR and audio transfer modes -->
<!-- <img src="images/project-file-transfer.png" alt="File Transfer" width="800"/> -->

---

## 🎮 Fun Stuff

<div id="-fun-stuff"></div>

AI/AR toys and experimental browser-based interaction. Route prefix: `/projects/fun-stuff/`.

### 1. Talking Characters
`/projects/fun-stuff/talking-characters`

Pick a character (Tomcat, Dog, Parrot, Robot, or Ghost) and it echoes your microphone input back through a matching audio filter — fully offline.

**Tech:** Web Audio API (`AudioContext`, filter nodes).

<!-- SCREENSHOT: Talking Characters selection screen -->
<!-- <img src="images/project-talking-characters.png" alt="Talking Characters" width="800"/> -->

### 2. AI Baby Monitor
`/projects/fun-stuff/baby-monitor`

An on-device, privacy-first baby monitor — person detection, configurable safe zones, cry detection, sleep tracking, and an analytics dashboard, all processed locally.

**Tech:** MediaPipe + TensorFlow.js (COCO-SSD) for detection, custom hooks (`useMediaPipe`, `useAudioDetection`, `useZoneDetection`, `useEventLog`, `useAnalytics`).

<!-- SCREENSHOT: AI Baby Monitor dashboard -->
<!-- <img src="images/project-baby-monitor.png" alt="AI Baby Monitor" width="800"/> -->

### 3. Fruit Ninja
`/projects/fun-stuff/fruit-ninja`

Slash fruits with your finger via real-time webcam hand tracking, dodge bombs, three lives, fully offline.

**Tech:** `@mediapipe/tasks-vision` (`hand_landmarker` running in a Web Worker), custom `GameCanvas` physics/collision engine, real-time Web Audio oscillator SFX.

<!-- SCREENSHOT: Fruit Ninja gameplay -->
<!-- <img src="images/project-fruit-ninja.png" alt="Fruit Ninja" width="800"/> -->

### 4. Eternal Journey
`/projects/fun-stuff/eternal-journey`

A modular, multi-page proposal theme — an interactive timeline of memories, reasons-to-love flip cards, and a story-driven "big question" finale.

**Tech:** Config-driven story data (`lib/config.ts`), its own `layout.tsx`, personal photo assets under `public/assets/images/eternal-journey/`.

<!-- SCREENSHOT: Eternal Journey timeline page -->
<!-- <img src="images/project-eternal-journey.png" alt="Eternal Journey" width="800"/> -->

### 5. Family Tree
`/projects/fun-stuff/family-tree`

Build interactive family trees with photos, dates, and relationship maps — supports multiple trees, sharing via a URL-encoded hash, and PNG export.

**Tech:** Custom `TreeCanvas`/`TreeEditor`, `html2canvas` (PNG export), share-state encoded/decoded into the URL hash, its own `layout.tsx`.

<!-- SCREENSHOT: Family Tree canvas view -->
<!-- <img src="images/project-family-tree.png" alt="Family Tree" width="800"/> -->

### 6. Webcam Pan & Zoom
`/projects/fun-stuff/webcam-pan-zoom`

A webcam viewer with smooth pan/zoom, mirroring, fullscreen, and floating on-screen controls — handy as a lightweight document-camera substitute.

**Tech:** Custom `useWebcam` hook, `react-zoom-pan-pinch`.

<!-- SCREENSHOT: Webcam Pan & Zoom controls -->
<!-- <img src="images/project-webcam-pan-zoom.png" alt="Webcam Pan & Zoom" width="800"/> -->

### 7. OpenMeet
`/projects/fun-stuff/open-meet`

A WebRTC video-calling app with chat, emoji reactions, hand-raise, and presence — Firebase is used **only** for call signaling, never for media transport.

**Tech:** WebRTC (`RTCPeerConnection`/`RTCDataChannel`), Firebase Realtime Database (signaling only). Built as a standalone embedded React app with its own `src/` tree.

<!-- SCREENSHOT: OpenMeet video call in progress -->
<!-- <img src="images/project-open-meet.png" alt="OpenMeet" width="800"/> -->

### 8. 3D Earth
`/projects/fun-stuff/earth-3d`

An interactive 3D globe with real country, city, river, and mountain data, zoomable from space down to street level with procedurally generated terrain.

**Tech:** Three.js (`OrbitControls`, `CSS2DRenderer`), GeoJSON data (`public/geo/*`), procedural texture generation, day/night/normal/specular Earth texture maps (`public/textures/*`).

<!-- SCREENSHOT: 3D Earth globe view -->
<!-- <img src="images/project-earth-3d.png" alt="3D Earth" width="800"/> -->

---

## 🔌 IoT

<div id="-iot"></div>

Device automation and integration tools. Route prefix: `/projects/iot/`.

### 1. IoT Bridge
`/projects/iot/bridge`

An IFTTT-style "if this, then that" rule builder for connected devices, supporting both a local simulation mode and live device integration.

**Tech:** Custom `AppletEditor` component, `ThemeContext`.

<!-- SCREENSHOT: IoT Bridge applet editor -->
<!-- <img src="images/project-iot-bridge.png" alt="IoT Bridge" width="800"/> -->

---

## 🤖 AI

<div id="-ai"></div>

`/projects/ai`

This category is currently a placeholder — the listing page renders a "More AI projects coming soon" empty state with no live projects yet.

---

<p align="center">
  <a href="../README.md">← Back to README</a> · <a href="ARCHITECTURE.md">Architecture</a> · <a href="SETUP.md">Setup</a>
</p>
