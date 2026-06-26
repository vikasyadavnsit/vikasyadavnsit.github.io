# 🚀 Vikas Yadav: An Operating System for Projects

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Framer-Motion-0055FF?style=for-the-badge&logo=framer" alt="Framer Motion" />
</p>

<p align="center">
  <strong>A high-performance personal portfolio showcasing the intersection of AI/ML, Creative Coding, and Web Security.</strong>
  <br />
  <a href="https://vikasyadavnsit.github.io">🏠 Visit Live Website</a> • <a href="#-technical-deep-dives">🔍 Technical Deep Dives</a> • <a href="#-getting-started">🔧 Getting Started</a>
</p>

---

## 🌟 Vision

This isn't just a portfolio—it's a decentralized hub for engineering excellence. Every project is built as a semi-autonomous "micro-app" with a heavy focus on **client-side execution**, **zero-latency**, and **privacy-first logic**.

---

## ✨ Featured Project Domains

### 🎮 Fun Stuff: AI & AR Toys
Experimental toys that push the boundaries of browser-based interaction.
- **Fruit Ninja AR:** Real-time **MediaPipe Hand Tracking** maps your finger to a virtual blade. Includes dynamic **Web Audio API** synthesis for SFX.
- **AI Baby Monitor:** On-device **TensorFlow.js** (COCO-SSD) for person detection and cry analysis via the `AnalyserNode`. 100% private.
- **Talking Characters:** Interactive 3D avatars processed through **Three.js** that echo voice inputs with custom audio filters.
- **Eternal Journey:** A modular, multi-page proposal theme with interactive timelines, flip cards, and dynamic story-driven logic.

### 🎨 Creative Stuff: Productivity Engines
Complex platforms for automation and visual expression.
- **Algorithm Arena:** Interactive LeetCode-style platform supporting **JS, TS, Python, Java, C++, and Go**. Features a custom resizable IDE and client-side test runner.
- **Workflow Builder:** A no-code visual engine powered by **React Flow**. Execute custom HTTP requests and sandboxed JS logic in a graph-based UI.
- **Digital Whiteboard:** High-performance canvas built with **P5.js** featuring infinite undo/redo and real-time state syncing via **Firebase**.
- **Request Lab:** A developer's API client (Postman alternative) running entirely in-browser with local collection management.

### 🛡️ Security & Utilities: Privacy-First
Zero-knowledge utilities using modern browser security APIs.
- **Security Suite:** **AES-256-GCM** encryption using the **SubtleCrypto API**. Keys are derived via **PBKDF2** locally; your password never leaves your device.
- **TOTP Authenticator:** Web-based 2FA with QR scanning and local HMAC-based code generation.
- **Internet Speed Test:** Real-time throughput analysis with historic performance tracking via **Recharts**.

---

## 🔍 Technical Deep Dives

<div id="-technical-deep-dives"></div>

<details>
<summary><b>1. Fruit Ninja AR: Hand-Tracking Game Loop</b></summary>
<br>

- **Initialization:** MediaPipe `hand_landmarker` task loads in a Web Worker to keep the UI thread smooth.
- **The Tracking Loop:** `requestAnimationFrame` captures frames → MediaPipe identifies 21 landmarks → Landmark 8 (Index Tip) coordinates are mapped to the game canvas.
- **Game Engine:** Custom physics engine manages fruit spawning, gravity, and bounding-box collision detection.
- **Audio:** Real-time oscillators synthesize "woosh" and "splat" sounds, ensuring a < 50KB assets footprint for sound effects.
</details>

<details>
<summary><b>2. Workflow Builder: Visual Logic Execution</b></summary>
<br>

- **Visual State:** Managed via **React Flow** context with persistent storage in **IndexedDB**.
- **Execution Engine:** A depth-first traverser walks the node graph.
  - **HTTP Nodes:** Execute client-side `fetch`.
  - **Code Nodes:** Execute user scripts in a sandboxed environment using `new Function()`.
  - **Transform Nodes:** Data mapping using JSONPath logic.
</details>

<details>
<summary><b>3. Security Suite: Zero-Knowledge Flow</b></summary>
<br>

- **Key Derivation:** Master Password + Salt → `PBKDF2` (100,000 iterations) → 256-bit AES Key.
- **Encryption:** `crypto.subtle.encrypt` using AES-GCM mode for authenticated encryption.
- **Storage:** Only the Initial Vector (IV), Salt, and Encrypted Blob are stored. This ensures the data is useless without the original master password.
</details>

<details>
<summary><b>4. Algorithm Arena: Multi-Language Simulation</b></summary>
<br>

- **Execution Model:** Native `new Function()` execution for JS/TS.
- **Logic Mapping:** Regex-based transpilation layers for Python, Java, C++, and Go map idiomatic constructs (e.g., `fmt.Println`, `vector<int>`) to JavaScript execution logic.
- **UI Architecture:** Custom-built `ResizablePane` component manages a draggable 3-pane layout without external libraries.
- **Persistence:** Real-time state syncing with `localStorage` ensures user code survives refreshes and language switches.
</details>

---

## 🛠️ Tech Stack & Infrastructure

- **Core:** [Next.js 16 (App Router)](https://nextjs.org/), TypeScript, Tailwind CSS.
- **AI/ML:** MediaPipe & TensorFlow.js.
- **Graphics:** Three.js (3D), P5.js (2D Canvas), Framer Motion (UI Animations).
- **Backend/State:** Firebase Realtime DB, IndexedDB (Client-side persistence).
- **Deployment:** [GitHub Actions](.github/workflows/nextjs.yml) for automated static export (`output: 'export'`) to GitHub Pages.

---

## 🔧 Getting Started

<div id="-getting-started"></div>

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/vikasyadavnsit/vikasyadavnsit.github.io.git

# Install dependencies
npm install

# Run the dev server
npm run dev
```

---

<p align="center">
  Developed with 💻 by <a href="https://github.com/vikasyadavnsit"><strong>Vikas Yadav</strong></a>
  <br />
  <em>Pushing the limits of what's possible in a browser.</em>
</p>
