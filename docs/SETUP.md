# 🔧 Setup Guide

Everything needed to run, build, and deploy this project locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone & Install](#clone--install)
- [Firebase](#firebase)
- [Development Server](#development-server)
- [Build (Static Export)](#build-static-export)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 24** (matches the version pinned in `.github/workflows/nextjs.yml`; older LTS versions will likely work too, but 24 is the tested baseline)
- **npm** (the repo ships a `package-lock.json`; the CI workflow auto-detects and uses npm)
- **Git**

## Clone & Install

<div id="clone--install"></div>

```bash
git clone https://github.com/vikasyadavnsit/vikasyadavnsit.github.io.git
cd vikasyadavnsit.github.io
npm install
```

If `npm install` fails on peer-dependency conflicts (React 19 is newer than some packages' declared peer ranges), do what CI does:

```bash
npm install --legacy-peer-deps
```

## Firebase

Firebase is the only backend this project uses — for the [blog CMS](ARCHITECTURE.md#data-architecture) and for a handful of projects that need cross-device sync (Whiteboard, Global Chat Hub, QR Login).

The config in `lib/firebase.ts` is **hardcoded** and points at the author's own Firebase project (`portfolio-projects-773a3`). This is safe to leave as-is if you're just running the app locally to browse/develop — a Firebase web config is a public client identifier, not a secret (see [`ARCHITECTURE.md`](ARCHITECTURE.md#security-notes)).

If you want to point the app at **your own** Firebase backend (e.g. to test the blog admin editor with your own content):

1. Create a project at the [Firebase console](https://console.firebase.google.com/).
2. Enable **Realtime Database**, **Authentication → Email/Password**, and **Storage**.
3. Create an admin user under Authentication → Users — this is the account that will sign in via `AuthGate` to reach `/blogs/admin`.
4. Replace the `firebaseConfig` object in `lib/firebase.ts` with your project's config (found in Firebase console → Project Settings → General → Your apps).
5. Blog posts are read/written under the `blogs/posts` path in Realtime Database — set security rules accordingly (e.g. public read for published posts, write restricted to authenticated users).

## Development Server

```bash
npm run dev
```

Runs on `http://localhost:3000` by default.

Several projects require camera/microphone access (Fruit Ninja, AI Baby Monitor, Webcam Pan & Zoom, OpenMeet), and `getUserMedia` requires a **secure context** (HTTPS or `localhost`). To test these on a real phone during development, `next.config.mjs` allows Cloudflare quick-tunnel origins out of the box:

```js
allowedDevOrigins: ['*.trycloudflare.com'],
```

Pair this with a `cloudflared tunnel --url http://localhost:3000` to get an HTTPS URL you can open on a mobile device.

## Build (Static Export)

<div id="build-static-export"></div>

```bash
npm run build
```

`next.config.mjs` sets `output: 'export'`, so this produces a fully static site in `out/` — no Node server required to serve it. To preview the exported build locally before deploying:

```bash
npx serve out
```

## Deployment

Deployment is fully automated via `.github/workflows/nextjs.yml`:

- **Trigger:** every push to `master`, or manually via the Actions tab (`workflow_dispatch`).
- **What it does:** installs dependencies, runs `next build`, uploads `out/` as a Pages artifact, and deploys it to GitHub Pages.
- No manual deploy step is needed — just push to `master`.

See [`ARCHITECTURE.md`](ARCHITECTURE.md#build--deployment-pipeline) for the full pipeline diagram.

## Environment Variables

**None are required.** There is no `.env` file in this repo today — the Firebase config is hardcoded in `lib/firebase.ts` (see [Firebase](#firebase) above). `.gitignore` reserves the `.env*.local` pattern in case you introduce environment-based secrets later, but nothing currently reads from `process.env` for configuration.

## Troubleshooting

- **Camera/mic projects don't work when testing on another device:** confirm you're accessing the dev server over HTTPS (e.g. via a `trycloudflare.com` tunnel) — plain `http://<lan-ip>:3000` will be blocked by the browser's secure-context requirement for `getUserMedia`.
- **`npm install` peer dependency errors:** use `npm install --legacy-peer-deps` (see [Clone & Install](#clone--install)).
- **Editing OpenMeet or Webcam Pan & Zoom:** these two projects (`app/projects/fun-stuff/open-meet/`, `app/projects/fun-stuff/webcam-pan-zoom/`) are vendored standalone Vite/React apps with their own `package.json` and `node_modules/` — installing the root project's dependencies does **not** install theirs. If you need to modify and rebuild one of these sub-apps, `cd` into its folder and run its own `npm install`/build separately, then the site serves its pre-built `dist/`/`public/` output as a static bundle.

---

<p align="center">
  <a href="../README.md">← Back to README</a> · <a href="ARCHITECTURE.md">Architecture</a> · <a href="PROJECTS.md">Project Catalog</a>
</p>
