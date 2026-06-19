"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, ArrowRight, AlertCircle, X } from "lucide-react";
import Link from "next/link";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";

const characters = [
  {
    id: "tomcat",
    name: "Tomcat",
    emoji: "🐱",
    label: "Kitty-ish",
    playbackRate: 1.4,
    filter: { type: "highshelf" as BiquadFilterType, frequency: 3000, gain: 8 },
    gradient: "from-orange-400 to-rose-500",
    glow: "shadow-orange-500/30",
    color: 0xff6d3a,
    accentColor: 0xffb347,
  },
  {
    id: "dog",
    name: "Dog",
    emoji: "🐶",
    label: "Gruff",
    playbackRate: 0.62,
    filter: { type: "lowshelf" as BiquadFilterType, frequency: 400, gain: 10 },
    gradient: "from-yellow-400 to-amber-500",
    glow: "shadow-yellow-500/30",
    color: 0xc8860a,
    accentColor: 0xffe0a0,
  },
  {
    id: "parrot",
    name: "Parrot",
    emoji: "🦜",
    label: "Squawky",
    playbackRate: 1.9,
    filter: { type: "peaking" as BiquadFilterType, frequency: 5000, gain: 12 },
    gradient: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-500/30",
    color: 0x00897b,
    accentColor: 0xff5722,
  },
  {
    id: "robot",
    name: "Robot",
    emoji: "🤖",
    label: "Monotone",
    playbackRate: 0.78,
    filter: { type: "bandpass" as BiquadFilterType, frequency: 1000, gain: 0 },
    distortion: true,
    gradient: "from-sky-400 to-blue-600",
    glow: "shadow-sky-500/30",
    color: 0x1565c0,
    accentColor: 0x00e5ff,
  },
  {
    id: "ghost",
    name: "Ghost",
    emoji: "👻",
    label: "Spooky",
    playbackRate: 0.45,
    reverb: true,
    gradient: "from-violet-400 to-purple-600",
    glow: "shadow-violet-500/30",
    color: 0x7b1fa2,
    accentColor: 0xea80fc,
  },
] as const;

type CharacterId = typeof characters[number]["id"];
type Phase = "idle" | "listening" | "speech" | "processing" | "playing" | "error";

// ─── Audio helpers ────────────────────────────────────────────────────────────

function createReverb(ctx: AudioContext): ConvolverNode {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function createDistortion(ctx: AudioContext, amount = 80): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
  }
  shaper.curve = curve;
  shaper.oversample = "4x";
  return shaper;
}

function getRMS(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

// ─── Character builders ───────────────────────────────────────────────────────

interface CharacterParts {
  group: THREE.Group;
  head: THREE.Object3D;
  body: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  outlineMeshes: THREE.Object3D[];
  robotScreen?: { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture };
  mouth?: THREE.Object3D;
  eyeLidL?: THREE.Object3D;
  eyeLidR?: THREE.Object3D;
  tail?: THREE.Object3D;
  extras?: THREE.Object3D[];
}

// ── Toon material — shared gradient for cel-shading ──────────────────────────
function makeToonGradient(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([28, 88, 168, 255]), 4, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
let _grad: THREE.DataTexture | null = null;
const G = () => (_grad ??= makeToonGradient());

const toon = (color: number, emissive = 0x000000, emissiveIntensity = 0) =>
  new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity, gradientMap: G() });

const toonT = (color: number, opacity: number) =>
  new THREE.MeshToonMaterial({ color, gradientMap: G(), transparent: true, opacity });

// Eye helper — returns [white, iris, pupil, glint] all added to parent
function addEye(parent: THREE.Group, x: number, y: number, z: number, irisColor: number) {
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), toon(0xffffff));
  white.position.set(x, y, z);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), toon(irisColor, irisColor, 0.25));
  iris.position.set(x, y, z + 0.04);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), toon(0x111111));
  pupil.position.set(x, y, z + 0.075);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), toon(0xffffff, 0xffffff, 1));
  glint.position.set(x - 0.03, y + 0.04, z + 0.09);
  parent.add(white, iris, pupil, glint);
}

// Eyelid helper — thin box that sits on top of eye
function makeLid(color: number, x: number, y: number, z: number): THREE.Mesh {
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.04), toon(color));
  lid.position.set(x, y, z);
  return lid;
}

// ── Tomcat ────────────────────────────────────────────────────────────────────
function buildTomcat(_c: number, _a: number): CharacterParts {
  const color = 0xff6d3a, accent = 0xffb347;
  // ── TOMCAT body ───────────────────────────────────────────────────────────
  const group = new THREE.Group();

  // Hair blob
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 16), toon(color));
  hair.scale.set(1, 0.62, 1);
  hair.position.set(0, 0.76, -0.06);

  // Head — giant chibi sphere
  const head = new THREE.Group();
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), toon(color));
  head.add(headMesh, hair);
  head.position.y = 0.74;

  // Ears
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 5), toon(color));
    ear.position.set(s * 0.33, 0.44, -0.08); ear.rotation.z = s * -0.28;
    const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 5), toon(0xffb3c1));
    earIn.position.set(s * 0.33, 0.43, -0.02); earIn.rotation.z = s * -0.28;
    head.add(ear, earIn);
  }

  // Big anime eyes
  addEye(head as unknown as THREE.Group, -0.17, 0.04, 0.46, 0x4caf50);
  addEye(head as unknown as THREE.Group,  0.17, 0.04, 0.46, 0x4caf50);
  const eyeLidL = makeLid(color, -0.17, 0.1, 0.47);
  const eyeLidR = makeLid(color,  0.17, 0.1, 0.47);
  head.add(eyeLidL, eyeLidR);

  // Tiny nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), toon(0xff8fab));
  nose.scale.set(1.3, 0.7, 0.8); nose.position.set(0, -0.06, 0.5);
  head.add(nose);

  // Mouth (animated)
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), toon(0x222222));
  mouth.scale.set(1.1, 0.35, 0.7); mouth.position.set(0, -0.17, 0.49);
  head.add(mouth);

  // Whiskers
  const wPos: number[] = [];
  for (const s of [-1, 1]) for (const r of [0.04, -0.03, -0.1])
    wPos.push(s * 0.2, r, 0.5, s * 0.55, r + 0.01, 0.3);
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(wPos), 3));
  head.add(new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 })));

  // Body — small chibi
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 16), toon(color));
  body.position.y = 0;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toon(0xfff3e0));
  belly.scale.set(0.9, 1.1, 0.5); belly.position.set(0, 0.04, 0.22);

  // Arms
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.42, 10), toon(color));
  leftArm.position.set(-0.3, 0.08, 0); leftArm.geometry.translate(0, -0.21, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.42, 10), toon(color));
  rightArm.position.set(0.3, 0.08, 0); rightArm.geometry.translate(0, -0.21, 0);

  // Paws
  const pawL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(color));
  pawL.scale.set(1, 0.6, 1.1); pawL.position.set(-0.3, -0.2, 0.04);
  const pawR = pawL.clone(); pawR.position.x = 0.3;

  // Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.38, 10), toon(color));
  legL.position.set(-0.13, -0.44, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.38, 10), toon(color));
  legR.position.set(0.13, -0.44, 0);

  // Curling tail
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24, -0.22, 0.08),
    new THREE.Vector3(0.5, -0.05, 0.14),
    new THREE.Vector3(0.55, 0.28, 0.04),
    new THREE.Vector3(0.32, 0.46, 0),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 20, 0.05, 8, false), toon(accent));

  group.add(body, belly, head, tail, leftArm, rightArm, pawL, pawR, legL, legR);
  group.scale.setScalar(1.15); group.position.y = -0.1;

  const outlineMeshes: THREE.Object3D[] = [];
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) outlineMeshes.push(o); });
  return { group, head, body, leftArm, rightArm, outlineMeshes, mouth, eyeLidL, eyeLidR, tail };
}

// ── Dog ───────────────────────────────────────────────────────────────────────
function buildDog(_c: number, _a: number): CharacterParts {
  const color = 0xc8860a, accent = 0xffe0a0;
  const group = new THREE.Group();

  // Hair blob
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 16), toon(color));
  hair.scale.set(1.05, 0.6, 1); hair.position.set(0, 0.76, -0.08);

  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), toon(color)), hair);
  head.position.y = 0.74;

  // Floppy ears
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.35, 0.28, 0.06),
      new THREE.Vector3(s * 0.5, 0.04, 0.08),
      new THREE.Vector3(s * 0.46, -0.26, 0.04),
    ]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.1, 8, false), toon(0x7a4a00)));
  }

  // Muzzle
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), toon(accent));
  muzzle.scale.set(1, 0.7, 0.85); muzzle.position.set(0, -0.1, 0.38);
  head.add(muzzle);

  // Big puppy eyes
  addEye(head as unknown as THREE.Group, -0.17, 0.1, 0.45, 0x5d3a1a);
  addEye(head as unknown as THREE.Group,  0.17, 0.1, 0.45, 0x5d3a1a);
  const eyeLidL = makeLid(color, -0.17, 0.17, 0.46);
  const eyeLidR = makeLid(color,  0.17, 0.17, 0.46);
  head.add(eyeLidL, eyeLidR);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0x111111));
  nose.scale.set(1.2, 0.7, 0.8); nose.position.set(0, -0.08, 0.5);
  head.add(nose);

  // Tongue
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), toon(0xff6e88));
  tongue.scale.set(1, 0.5, 0.7); tongue.position.set(0, -0.22, 0.46);
  head.add(tongue);

  // Mouth
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(0x111111));
  mouth.scale.set(1, 0.3, 0.7); mouth.position.set(0, -0.17, 0.48);
  head.add(mouth);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 18), toon(color));
  body.scale.set(1, 0.9, 0.88); body.position.y = 0;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), toon(accent));
  belly.scale.set(0.85, 1, 0.48); belly.position.set(0, -0.02, 0.24);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.44, 10), toon(color));
  leftArm.position.set(-0.32, 0.06, 0); leftArm.geometry.translate(0, -0.22, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.44, 10), toon(color));
  rightArm.position.set(0.32, 0.06, 0); rightArm.geometry.translate(0, -0.22, 0);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.38, 10), toon(color));
  legL.position.set(-0.13, -0.44, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.38, 10), toon(color));
  legR.position.set(0.13, -0.44, 0);

  const tailC = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.24, 0.08, -0.26),
    new THREE.Vector3(-0.44, 0.36, -0.18),
    new THREE.Vector3(-0.3, 0.58, -0.04),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailC, 12, 0.058, 8, false), toon(0x7a4a00));

  group.add(body, belly, head, tail, leftArm, rightArm, legL, legR);
  group.scale.setScalar(1.15); group.position.y = -0.1;

  const outlineMeshes: THREE.Object3D[] = [];
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) outlineMeshes.push(o); });
  return { group, head, body, leftArm, rightArm, outlineMeshes, mouth, eyeLidL, eyeLidR, tail };
}

// ── Parrot ────────────────────────────────────────────────────────────────────
function buildParrot(_c: number, _a: number): CharacterParts {
  const color = 0x00897b, accent = 0xff5722;
  const group = new THREE.Group();

  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 28), toon(color)));
  head.position.y = 0.72;

  // Crest plumes
  for (let i = -1; i <= 1; i++) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), toon(accent));
    p.position.set(i * 0.12, 0.46, -0.04); p.rotation.z = i * 0.28;
    head.add(p);
  }

  // Hook beak
  const beakTop = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), toon(0xff8f00));
  beakTop.rotation.x = Math.PI / 2 + 0.5; beakTop.position.set(0, -0.06, 0.42);
  const mouth = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 6), toon(0xff6f00));
  mouth.rotation.x = -(Math.PI / 2 - 0.38); mouth.position.set(0, -0.18, 0.42);
  head.add(beakTop, mouth);

  // Eye ring + big eye
  const eyeLids: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    head.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 18), toon(0xffffff)));
    const ring = head.children[head.children.length - 1];
    ring.position.set(s * 0.22, 0.08, 0.38); (ring as THREE.Mesh).rotation.y = s * 0.42;
    addEye(head as unknown as THREE.Group, s * 0.24, 0.08, 0.4, 0xfdd835);
    const lid = makeLid(color, s * 0.24, 0.16, 0.41);
    eyeLids.push(lid); head.add(lid);
  }
  const eyeLidL = eyeLids[0], eyeLidR = eyeLids[1];

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 18), toon(color));
  body.scale.set(1, 1.28, 0.86); body.position.y = 0;

  // Wings as arms
  const leftArm = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), toon(accent));
  leftArm.scale.set(0.32, 0.92, 0.16); leftArm.position.set(-0.46, 0.04, 0);
  leftArm.geometry.translate(0, -0.18, 0);
  const rightArm = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), toon(accent));
  rightArm.scale.set(0.32, 0.92, 0.16); rightArm.position.set(0.46, 0.04, 0);
  rightArm.geometry.translate(0, -0.18, 0);

  // Tail feathers
  for (let i = -1; i <= 1; i++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.018, 0.62, 6),
      toon([color, accent, 0xff8a65][i + 1]));
    f.position.set(i * 0.1, -0.6, -0.18); f.rotation.x = 0.44; f.rotation.z = i * 0.16;
    group.add(f);
  }

  // Legs
  for (const s of [-1, 1]) {
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 8), toon(0x9e9e9e)));
    group.children[group.children.length - 1].position.set(s * 0.11, -0.56, 0);
  }

  group.add(body, head, leftArm, rightArm);
  group.scale.setScalar(1.15); group.position.y = -0.1;

  const outlineMeshes: THREE.Object3D[] = [];
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) outlineMeshes.push(o); });
  return { group, head, body, leftArm, rightArm, outlineMeshes, mouth, eyeLidL, eyeLidR };
}

// ── Robot ─────────────────────────────────────────────────────────────────────
function buildRobot(_c: number, _a: number): CharacterParts {
  const color = 0x1565c0, accent = 0x00e5ff;
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.44), toon(color));
  const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.45), toon(accent, accent, 0.5));
  chestPanel.position.set(0, 0.08, 0);
  group.add(body, chestPanel);

  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.56, 0.5), toon(color)));
  // Visor brow
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.52), toon(0x0d3a7a));
  brow.position.set(0, 0.26, 0); head.add(brow);
  head.position.y = 0.69;

  // Live audio screen
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 160; screenCanvas.height = 120;
  const screenCtx = screenCanvas.getContext("2d")!;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33),
    new THREE.MeshBasicMaterial({ map: screenTex }));
  screenMesh.position.set(0, -0.02, 0.256); head.add(screenMesh);

  // Antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), toon(0x0d3a7a));
  ant.position.set(0, 0.5, 0);
  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), toon(accent, accent, 1.0));
  antTip.position.set(0, 0.7, 0);
  head.add(ant, antTip);

  // Shoulder joints (glowing)
  for (const s of [-1, 1]) {
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.11, 12), toon(accent, accent, 0.6));
    j.position.set(s * 0.4, 0.32, 0); j.rotation.z = Math.PI / 2;
    group.add(j);
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), toon(color)));
  (leftArm.children[0] as THREE.Mesh).geometry.translate(0, -0.29, 0);
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.2), toon(accent, accent, 0.3));
  lHand.position.y = -0.58; leftArm.add(lHand);
  leftArm.position.set(-0.44, 0.28, 0);

  const rightArm = new THREE.Group();
  rightArm.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), toon(color)));
  (rightArm.children[0] as THREE.Mesh).geometry.translate(0, -0.29, 0);
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.2), toon(accent, accent, 0.3));
  rHand.position.y = -0.58; rightArm.add(rHand);
  rightArm.position.set(0.44, 0.28, 0);

  // Legs + feet
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), toon(color));
    leg.position.set(s * 0.18, -0.61, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.32), toon(0x0d3a7a));
    foot.position.set(s * 0.18, -0.89, 0.04);
    group.add(leg, foot);
  }

  group.add(head, leftArm, rightArm);
  group.scale.setScalar(1.15); group.position.y = -0.1;

  const outlineMeshes: THREE.Object3D[] = [];
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o !== screenMesh) outlineMeshes.push(o); });
  return { group, head, body, leftArm, rightArm, outlineMeshes, robotScreen: { ctx: screenCtx, tex: screenTex }, extras: [antTip] };
}

// ── Ghost ─────────────────────────────────────────────────────────────────────
function buildGhost(_c: number, _a: number): CharacterParts {
  const color = 0x7b1fa2, accent = 0xea80fc;
  const group = new THREE.Group();

  const ghostMat = toonT(new THREE.Color(color).lerp(new THREE.Color(0xddddff), 0.5).getHex(), 0.84);
  const auraMat = new THREE.MeshToonMaterial({ color: accent, gradientMap: G(), transparent: true, opacity: 0.14, emissive: new THREE.Color(accent), emissiveIntensity: 0.5 });

  // Outer aura
  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 24), auraMat);
  aura.position.y = 0.1; group.add(aura);

  // Wavy body via LatheGeometry
  const lp: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = 0.58 - t * 1.18;
    let r = 0.44 * Math.sin(t * Math.PI * 0.88);
    if (t > 0.7) r += 0.08 * Math.abs(Math.sin(((t - 0.7) / 0.3) * Math.PI * 4));
    lp.push(new THREE.Vector2(Math.max(0, r), y));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(lp, 28), ghostMat.clone());
  group.add(body);

  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 32), ghostMat.clone()));
  head.position.y = 0.8;

  // Hollow glowing eyes
  for (const s of [-1, 1]) {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 14),
      new THREE.MeshToonMaterial({ color: 0x080010, gradientMap: G(), emissive: new THREE.Color(accent), emissiveIntensity: 0.7 }));
    hole.scale.set(1, 1.25, 0.7); hole.position.set(s * 0.16, 0.04, 0.46);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10),
      new THREE.MeshToonMaterial({ color: accent, gradientMap: G(), emissive: new THREE.Color(accent), emissiveIntensity: 1.4, transparent: true, opacity: 0.75 }));
    glow.position.set(s * 0.16, 0.04, 0.48);
    head.add(hole, glow);
  }

  // Mouth O
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.03, 8, 14),
    new THREE.MeshToonMaterial({ color: 0x080010, gradientMap: G(), emissive: new THREE.Color(accent), emissiveIntensity: 0.45 }));
  mouth.position.set(0, -0.12, 0.5); head.add(mouth);

  // Eyelid glows (pulse on blink)
  const eyeLidL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
    new THREE.MeshToonMaterial({ color: accent, gradientMap: G(), emissive: new THREE.Color(accent), emissiveIntensity: 1, transparent: true, opacity: 0.55 }));
  eyeLidL.position.set(-0.16, 0.12, 0.49);
  const eyeLidR = eyeLidL.clone(); eyeLidR.position.x = 0.16;
  head.add(eyeLidL, eyeLidR);

  // Wispy arms
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.03, 0.52, 8), ghostMat.clone());
  leftArm.position.set(-0.46, 0.08, 0); leftArm.geometry.translate(0, -0.26, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.03, 0.52, 8), ghostMat.clone());
  rightArm.position.set(0.46, 0.08, 0); rightArm.geometry.translate(0, -0.26, 0);

  // Floating particles
  const ptPos: number[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = 0.55 + (i % 3) * 0.15;
    ptPos.push(Math.cos(a) * r, -0.2 + (i % 5) * 0.28, Math.sin(a) * r);
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ptPos), 3));
  const particles = new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: accent, size: 0.055, transparent: true, opacity: 0.75 }));
  group.add(particles);

  group.add(head, leftArm, rightArm);
  group.scale.setScalar(1.15); group.position.y = -0.05;

  const outlineMeshes: THREE.Object3D[] = [];
  return { group, head, body, leftArm, rightArm, outlineMeshes, mouth, eyeLidL, eyeLidR, extras: [particles] };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
function buildCharacter(id: CharacterId, color: number, accent: number): CharacterParts {
  if (id === "tomcat") return buildTomcat(color, accent);
  if (id === "dog") return buildDog(color, accent);
  if (id === "parrot") return buildParrot(color, accent);
  if (id === "robot") return buildRobot(color, accent);
  return buildGhost(color, accent);
}

// ─── ThreeCharacter component ─────────────────────────────────────────────────

interface ThreeCharacterProps {
  characterId: CharacterId;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isActiveRef: React.MutableRefObject<boolean>;
  color: number;
  accentColor: number;
}

function ThreeCharacter({ characterId, analyserRef, isActiveRef, color, accentColor }: ThreeCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth || 288;
    const H = canvas.clientHeight || 288;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 20);
    camera.position.set(0, 0.22, 2.5);
    camera.lookAt(0, 0.15, 0);

    // Toon shading needs directional light — low ambient so shadow steps show
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(1.5, 4, 3.5); key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(new THREE.Color(color), 0.9);
    fill.position.set(-2.5, 1, 1.5);
    scene.add(fill);

    // Build character
    const parts = buildCharacter(characterId, color, accentColor);
    scene.add(parts.group);

    // EffectComposer
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    if (parts.outlineMeshes.length > 0) {
      const outlinePass = new OutlinePass(new THREE.Vector2(W, H), scene, camera);
      outlinePass.edgeStrength = 4.5;
      outlinePass.edgeGlow = 0.6;
      outlinePass.edgeThickness = 2.0;
      outlinePass.visibleEdgeColor.set(0x000000);
      outlinePass.hiddenEdgeColor.set(0x111111);
      outlinePass.selectedObjects = parts.outlineMeshes;
      composer.addPass(outlinePass);
    }

    composer.addPass(new OutputPass());

    // Animation state (spring physics)
    let bBounce = 0, bSwing = 0, bBob = 0;
    const FREQ_BINS = 512;
    const freqData = new Uint8Array(FREQ_BINS);
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const analyser = analyserRef.current;
      const isActive = isActiveRef.current;

      let bass = 0, mid = 0, treble = 0;
      if (analyser) {
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < 5; i++) bass += freqData[i];
        bass = bass / 5 / 255;
        for (let i = 5; i < 45; i++) mid += freqData[i];
        mid = mid / 40 / 255;
        for (let i = 45; i < 110; i++) treble += freqData[i];
        treble = treble / 65 / 255;
      }

      // Robot screen update
      if (parts.robotScreen && analyser) {
        const c = parts.robotScreen.ctx;
        c.fillStyle = "#000d1a";
        c.fillRect(0, 0, 160, 120);
        c.fillStyle = "#00ff88";
        for (let i = 0; i < 12; i++) {
          const barH = (freqData[i * 4 + 2] / 255) * 88;
          c.fillRect(i * 13 + 2, 120 - barH - 4, 11, barH);
        }
        const eyeSize = bass > 0.45 ? 10 : 14;
        c.fillStyle = "#00e5ff";
        c.beginPath(); c.arc(48, 22, eyeSize, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(112, 22, eyeSize, 0, Math.PI * 2); c.fill();
        parts.robotScreen.tex.needsUpdate = true;
      } else if (parts.robotScreen && !analyser) {
        const c = parts.robotScreen.ctx;
        c.fillStyle = "#000d1a";
        c.fillRect(0, 0, 160, 120);
        c.fillStyle = "#004455";
        c.beginPath(); c.arc(48, 30, 12, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(112, 30, 12, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#002233";
        for (let i = 0; i < 12; i++) {
          c.fillRect(i * 13 + 2, 110, 11, 3);
        }
        parts.robotScreen.tex.needsUpdate = true;
      }

      // Spring targets
      const idleBounce = Math.sin(t * 1.6) * 0.04;
      const idleRock = Math.sin(t * 0.9) * 0.025;
      const tBounce = bass * 0.38 + idleBounce;
      const tSwing = mid * 1.15 + (isActive ? Math.sin(t * 2.8) * 0.08 : Math.sin(t * 1.8) * 0.07);
      const tBob = treble * 0.55 + idleRock;

      // Damped spring lerp
      bBounce += (tBounce - bBounce) * 0.14;
      bSwing += (tSwing - bSwing) * 0.11;
      bBob += (tBob - bBob) * 0.17;

      // Apply to parts
      parts.group.position.y = -0.1 + bBounce * 0.18;
      parts.body.position.y = bBounce * 0.22;
      (parts.body as THREE.Mesh).scale && (parts.body as THREE.Mesh).scale.setY(1 + bass * 0.09);

      parts.leftArm.rotation.z = bSwing + 0.12;
      parts.rightArm.rotation.z = -(bSwing + 0.12);

      (parts.head as THREE.Group | THREE.Mesh).rotation.y = bBob * 0.85;
      (parts.head as THREE.Group | THREE.Mesh).rotation.z = (treble - 0.5) * 0.1;
      (parts.head as THREE.Group | THREE.Mesh).scale.setScalar(1 + treble * 0.055);

      const tRotY = isActive ? Math.sin(t * 2.2) * 0.07 + bass * 0.07 : 0;
      parts.group.rotation.y += (tRotY - parts.group.rotation.y) * 0.045;

      // Mouth open/close on bass + mid
      if (parts.mouth) {
        const mouthOpen = 1 + (bass * 0.9 + mid * 0.5);
        parts.mouth.scale.y += (mouthOpen - parts.mouth.scale.y) * 0.22;
      }

      // Eyelid blink every ~3s
      const blinkT = Math.sin(t * 1.05);
      const blinkAmt = blinkT > 0.96 ? (blinkT - 0.96) / 0.04 : 0;
      if (parts.eyeLidL) parts.eyeLidL.scale.y = 1 + blinkAmt * 5;
      if (parts.eyeLidR) parts.eyeLidR.scale.y = 1 + blinkAmt * 5;

      // Tail wag on bass
      if (parts.tail) {
        const wagTarget = bass * 1.1 + Math.sin(t * 5) * 0.18;
        parts.tail.rotation.z += (wagTarget - parts.tail.rotation.z) * 0.13;
      }

      // Extras: robot antenna tip orbit, ghost particle spin
      if (parts.extras?.[0]) {
        if (characterId === "robot") {
          parts.extras[0].position.x = Math.sin(t * 3) * 0.12;
          parts.extras[0].position.z = Math.cos(t * 3) * 0.12;
        } else if (characterId === "ghost") {
          parts.extras[0].rotation.y = t * 0.6;
          parts.extras[0].position.y = Math.sin(t * 0.8) * 0.08;
        }
      }

      composer.render();
    };
    animate();

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      window.removeEventListener("resize", onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, color, accentColor]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TalkingCharactersPage() {
  const [selectedId, setSelectedId] = useState<CharacterId>("tomcat");
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Refs read by Three.js animation loop every frame
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isActiveRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopingRef = useRef(false);
  const selectedRef = useRef<typeof characters[number]>(characters[0]);
  const micNodesRef = useRef<{
    source: MediaStreamAudioSourceNode;
    hpf: BiquadFilterNode;
    comp: DynamicsCompressorNode;
    analyser: AnalyserNode;
  } | null>(null);

  const selected = characters.find((c) => c.id === selectedId)!;
  selectedRef.current = selected;

  const clearVAD = () => {
    if (vadIntervalRef.current) { clearInterval(vadIntervalRef.current); vadIntervalRef.current = null; }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const getOrCreateCtx = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  // Called after each playback ends — loops back to listening
  const startListening = useCallback(async () => {
    if (!loopingRef.current) return;

    chunksRef.current = [];
    setPhase("listening");
    isActiveRef.current = false;

    let stream = streamRef.current;
    if (!stream || stream.getTracks().some((t) => t.readyState === "ended")) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
        });
        streamRef.current = stream;
      } catch {
        setErrorMsg("Microphone access lost. Tap again to restart.");
        setPhase("error");
        setStarted(false);
        loopingRef.current = false;
        return;
      }
    }

    // Disconnect previous mic chain to prevent node accumulation
    if (micNodesRef.current) {
      try {
        micNodesRef.current.source.disconnect();
        micNodesRef.current.hpf.disconnect();
        micNodesRef.current.comp.disconnect();
        micNodesRef.current.analyser.disconnect();
      } catch { /* already disconnected */ }
      micNodesRef.current = null;
    }

    const ctx = getOrCreateCtx();
    const micSource = ctx.createMediaStreamSource(stream);
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass"; hpf.frequency.value = 80;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -30; comp.ratio.value = 12;
    comp.attack.value = 0.002; comp.release.value = 0.15;
    const micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 512; micAnalyser.smoothingTimeConstant = 0.7;
    micSource.connect(hpf); hpf.connect(comp); comp.connect(micAnalyser);
    analyserRef.current = micAnalyser;
    micNodesRef.current = { source: micSource, hpf, comp, analyser: micAnalyser };

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      clearVAD();
      analyserRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (chunksRef.current.length > 0 && loopingRef.current) {
        playAudio(blob);
      } else if (loopingRef.current) {
        // No speech captured (e.g. character switch mid-listen) — restart loop
        startListening();
      }
    };

    // DO NOT start recorder here — defer until speech is detected

    // VAD
    const VAD_SILENCE_MS = 700;
    const VAD_MAX_MS = 15000;
    const timeDomain = new Uint8Array(micAnalyser.fftSize);
    let speechStart = 0;
    let lastLoudTime = 0;
    let speechSeen = false;

    // Calibrate ambient noise floor in first 400ms
    let ambientRMS = 0.02;
    const calibSamples: number[] = [];
    const calibEnd = Date.now() + 400;

    vadIntervalRef.current = setInterval(() => {
      if (!loopingRef.current) { clearVAD(); return; }
      micAnalyser.getByteTimeDomainData(timeDomain);
      const rms = getRMS(timeDomain);

      if (Date.now() < calibEnd) {
        calibSamples.push(rms);
        if (calibSamples.length > 3) {
          ambientRMS = calibSamples.reduce((a, b) => a + b, 0) / calibSamples.length;
        }
        return;
      }

      const threshold = Math.max(ambientRMS * 2.5, 0.025);

      if (rms > threshold) {
        if (!speechSeen) {
          // Start recording only when speech is actually detected
          recorder.start();
          speechStart = Date.now();
          lastLoudTime = Date.now();
          speechSeen = true;
          setPhase("speech");
          isActiveRef.current = true;
        } else {
          lastLoudTime = Date.now();
        }
      }

      const silenced = speechSeen && Date.now() - lastLoudTime > VAD_SILENCE_MS;
      const timedOut = speechSeen && Date.now() - speechStart > VAD_MAX_MS;

      if (silenced || timedOut) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }
    }, 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playAudio = useCallback(async (blob: Blob) => {
    if (!loopingRef.current) return;
    setPhase("processing");
    isActiveRef.current = false;
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = getOrCreateCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = selectedRef.current.playbackRate;
      sourceRef.current = source;

      const hpf = ctx.createBiquadFilter();
      hpf.type = "highpass"; hpf.frequency.value = 80;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.25;

      const playAnalyser = ctx.createAnalyser();
      playAnalyser.fftSize = 512; playAnalyser.smoothingTimeConstant = 0.8;
      analyserRef.current = playAnalyser;

      source.connect(hpf); hpf.connect(comp);
      let lastNode: AudioNode = comp;

      const sel = selectedRef.current;
      if ("filter" in sel && sel.filter) {
        const f = ctx.createBiquadFilter();
        f.type = sel.filter.type; f.frequency.value = sel.filter.frequency;
        if (sel.filter.gain) f.gain.value = sel.filter.gain;
        lastNode.connect(f); lastNode = f;
      }
      if ("distortion" in sel && sel.distortion) {
        const dist = createDistortion(ctx);
        lastNode.connect(dist); lastNode = dist;
      }

      lastNode.connect(playAnalyser);

      if ("reverb" in sel && sel.reverb) {
        const reverb = createReverb(ctx);
        const dry = ctx.createGain(); dry.gain.value = 0.3;
        const wet = ctx.createGain(); wet.gain.value = 0.85;
        lastNode.connect(dry); dry.connect(ctx.destination);
        lastNode.connect(reverb); reverb.connect(wet); wet.connect(ctx.destination);
      } else {
        lastNode.connect(ctx.destination);
      }

      source.start();
      setPhase("playing");
      isActiveRef.current = true;
      let endedFired = false;
      const onEnded = () => {
        if (endedFired) return;
        endedFired = true;
        analyserRef.current = null;
        isActiveRef.current = false;
        if (loopingRef.current) startListening();
        else setPhase("idle");
      };
      source.onended = onEnded;
      // Fallback: if onended never fires (very short/silent audio), force-advance
      const fallbackMs = (audioBuffer.duration * 1000 + 500) / source.playbackRate.value;
      setTimeout(onEnded, Math.max(fallbackMs, 900));
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not process audio. Retrying…");
      setPhase("error");
      analyserRef.current = null;
      if (loopingRef.current) setTimeout(() => startListening(), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startListening]);

  const handleStart = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      streamRef.current = stream;
      loopingRef.current = true;
      setStarted(true);
      // startListening will reuse the stream
      await startListening();
    } catch {
      setErrorMsg("Microphone access denied. Please allow mic permissions.");
      setPhase("error");
    }
  };

  const handleClose = () => {
    loopingRef.current = false;
    clearVAD();
    if (micNodesRef.current) {
      try {
        micNodesRef.current.source.disconnect();
        micNodesRef.current.hpf.disconnect();
        micNodesRef.current.comp.disconnect();
        micNodesRef.current.analyser.disconnect();
      } catch { /* ignore */ }
      micNodesRef.current = null;
    }
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    sourceRef.current?.stop();
    sourceRef.current = null;
    analyserRef.current = null;
    isActiveRef.current = false;
    stopStream();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setStarted(false);
    setPhase("idle");
    setErrorMsg("");
  };

  const switchCharacter = (id: CharacterId) => {
    setSelectedId(id);
    if (!loopingRef.current) return;
    // Stop current activity cleanly and restart listening as the new character
    clearVAD();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    try { sourceRef.current?.stop(); } catch { /* ignore */ }
    sourceRef.current = null;
    analyserRef.current = null;
    isActiveRef.current = false;
    chunksRef.current = [];
    // Small delay lets React flush the new selectedId so selectedRef updates before recording starts
    setTimeout(() => { if (loopingRef.current) startListening(); }, 150);
  };

  useEffect(() => () => { loopingRef.current = false; clearVAD(); stopStream(); }, []);

  const isActive = phase === "speech" || phase === "playing";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-10 bg-gradient-to-br ${selected.gradient} transition-all duration-700`} />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center">
        {/* Back + Close row */}
        <div className="self-stretch flex items-center justify-between mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href="/projects/fun-stuff"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Back
            </Link>
          </motion.div>

          <AnimatePresence>
            {started && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClose}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                aria-label="Stop and close"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">
            Talking <span className="text-muted-foreground">Characters</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Speak — they dance and echo back in their style.
          </p>
        </motion.div>

        {/* Character selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mb-10 flex-wrap justify-center"
        >
          {characters.map((c) => (
            <button
              key={c.id}
              onClick={() => switchCharacter(c.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-300 ${
                selectedId === c.id
                  ? `bg-gradient-to-r ${c.gradient} border-transparent text-white shadow-lg ${c.glow}`
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              }`}
            >
              <span className="text-base">{c.emoji}</span>
              {c.name}
            </button>
          ))}
        </motion.div>

        {/* 3D Character */}
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative flex flex-col items-center mb-10"
        >
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            <div className="w-full h-full rounded-2xl overflow-hidden">
              <ThreeCharacter
                characterId={selectedId}
                analyserRef={analyserRef}
                isActiveRef={isActiveRef}
                color={selected.color}
                accentColor={selected.accentColor}
              />
            </div>

            {/* Ripple rings while playing */}
            <AnimatePresence>
              {phase === "playing" && [0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${selected.gradient} opacity-15 pointer-events-none`}
                  initial={{ scale: 0.85, opacity: 0.25 }}
                  animate={{ scale: 1.5 + i * 0.25, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, delay: i * 0.35, repeat: Infinity }}
                />
              ))}
            </AnimatePresence>

            {/* Listening pulse */}
            <AnimatePresence>
              {phase === "listening" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-muted-foreground"
                      animate={{ height: ["6px", "14px", "6px"] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground font-medium ml-1">Listening</span>
                </motion.div>
              )}
              {phase === "speech" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                  <span className="text-xs text-red-400 font-medium">Capturing…</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-lg font-bold mt-7">{selected.name}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{selected.label} voice</p>
        </motion.div>

        {/* CTA / status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-5 w-full"
        >
          <AnimatePresence mode="wait">
            {!started ? (
              <motion.button
                key="start"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleStart}
                className={`relative flex items-center justify-center gap-3 px-12 py-4 rounded-full font-bold text-base bg-gradient-to-r ${selected.gradient} text-white shadow-xl ${selected.glow} hover:scale-105 active:scale-95 transition-transform duration-200`}
              >
                <Mic className="w-5 h-5" />
                Click to Play
              </motion.button>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <AnimatePresence mode="wait">
                  {phase === "processing" && (
                    <motion.div
                      key="proc"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                      />
                      Applying {selected.name} voice…
                    </motion.div>
                  )}
                  {phase === "playing" && (
                    <motion.div
                      key="play"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${selected.gradient} bg-clip-text text-transparent`}
                    >
                      <Volume2 className="w-4 h-4 text-current" style={{ color: "white", opacity: 0.7 }} />
                      Playing as {selected.name}…
                    </motion.div>
                  )}
                  {phase === "error" && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg || "Something went wrong"}
                    </motion.div>
                  )}
                </AnimatePresence>

                {(phase === "listening" || phase === "speech") && (
                  <p className="text-xs text-muted-foreground text-center">
                    {phase === "listening" ? "Waiting for you to speak…" : "Speak! Stops automatically when silent."}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
            {started
              ? "Noise cancellation on · Max 15 s · Loops automatically · Use × to stop"
              : "Noise cancellation on · Your voice never leaves this device"}
          </p>
        </motion.div>
      </div>
    </main>
  );
}
