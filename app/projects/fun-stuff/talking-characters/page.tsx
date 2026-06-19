"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, ArrowRight, AlertCircle, X } from "lucide-react";
import Link from "next/link";
import * as THREE from "three";

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
    color: 0xff7043,
    accentColor: 0xff8a65,
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
    color: 0xf9a825,
    accentColor: 0xffcc02,
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
    color: 0x26a69a,
    accentColor: 0xff7043,
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
    color: 0x42a5f5,
    accentColor: 0x80deea,
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
    color: 0xab47bc,
    accentColor: 0xce93d8,
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

// ─── Three.js character builder ───────────────────────────────────────────────

function buildCharacter(id: CharacterId, color: number, accent: number): {
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
} {
  const mat = (c: number, emissive = 0x000000) =>
    new THREE.MeshStandardMaterial({ color: c, emissive, roughness: 0.4, metalness: 0.2 });

  const group = new THREE.Group();
  let head: THREE.Mesh, body: THREE.Mesh, leftArm: THREE.Mesh, rightArm: THREE.Mesh;

  if (id === "robot") {
    body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.45), mat(color));
    head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.4), mat(color));
    head.position.y = 0.7;
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.05);
    const eyeL = new THREE.Mesh(eyeGeo, mat(accent, accent)); eyeL.position.set(-0.12, 0.75, 0.23);
    const eyeR = new THREE.Mesh(eyeGeo.clone(), mat(accent, accent)); eyeR.position.set(0.12, 0.75, 0.23);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), mat(accent));
    ant.position.set(0, 1.1, 0);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(accent, accent));
    antTip.position.set(0, 1.3, 0);
    leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), mat(accent));
    leftArm.position.set(-0.48, -0.05, 0); leftArm.geometry.translate(0, -0.325, 0);
    rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), mat(accent));
    rightArm.position.set(0.48, -0.05, 0); rightArm.geometry.translate(0, -0.325, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), mat(color));
    legL.position.set(-0.2, -0.68, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), mat(color));
    legR.position.set(0.2, -0.68, 0);
    group.add(body, head, eyeL, eyeR, ant, antTip, leftArm, rightArm, legL, legR);

  } else if (id === "tomcat") {
    body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.8, 12), mat(color));
    head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), mat(color));
    head.position.y = 0.75;
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 8), mat(accent));
    earL.position.set(-0.22, 1.1, 0); earL.rotation.z = -0.3;
    const earR = earL.clone(); earR.position.x = 0.22; earR.rotation.z = 0.3;
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(0x66bb6a, 0x66bb6a));
    eyeL.position.set(-0.14, 0.8, 0.33);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.14;
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 16, Math.PI), mat(accent));
    tail.position.set(-0.35, -0.3, 0); tail.rotation.z = 1.2;
    leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), mat(accent));
    leftArm.position.set(-0.42, 0.08, 0); leftArm.geometry.translate(0, -0.275, 0);
    rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), mat(accent));
    rightArm.position.set(0.42, 0.08, 0); rightArm.geometry.translate(0, -0.275, 0);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.5, 8), mat(color));
    legL.position.set(-0.16, -0.65, 0);
    const legR = legL.clone(); legR.position.x = 0.16;
    group.add(body, head, earL, earR, eyeL, eyeR, tail, leftArm, rightArm, legL, legR);

  } else if (id === "dog") {
    body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), mat(color));
    body.scale.set(1, 0.85, 0.9);
    head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), mat(color));
    head.position.y = 0.72;
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.4, 8), mat(accent));
    earL.position.set(-0.32, 0.65, 0); earL.rotation.z = 0.6;
    const earR = earL.clone(); earR.position.x = 0.32; earR.rotation.z = -0.6;
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), mat(accent));
    snout.position.set(0, 0.65, 0.3); snout.scale.set(1, 0.7, 0.8);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mat(0x222222));
    nose.position.set(0, 0.7, 0.46);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.38, 8), mat(accent));
    tail.position.set(-0.35, 0.15, -0.22); tail.rotation.z = 0.8; tail.rotation.x = -0.5;
    leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8), mat(color));
    leftArm.position.set(-0.48, 0.05, 0); leftArm.geometry.translate(0, -0.25, 0);
    rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8), mat(color));
    rightArm.position.set(0.48, 0.05, 0); rightArm.geometry.translate(0, -0.25, 0);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.48, 8), mat(color));
    legL.position.set(-0.17, -0.6, 0);
    const legR = legL.clone(); legR.position.x = 0.17;
    group.add(body, head, earL, earR, snout, nose, tail, leftArm, rightArm, legL, legR);

  } else if (id === "parrot") {
    body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat(color));
    body.scale.set(1, 1.2, 0.85);
    head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat(color));
    head.position.y = 0.7;
    const beakTop = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 6), mat(0xffa000));
    beakTop.position.set(0, 0.65, 0.32); beakTop.rotation.x = Math.PI / 2 + 0.3;
    const beakBot = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), mat(0xff8f00));
    beakBot.position.set(0, 0.56, 0.34); beakBot.rotation.x = -(Math.PI / 2 - 0.3);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(0xffffff));
    eyeL.position.set(-0.17, 0.76, 0.22);
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(0x111111));
    pupilL.position.set(-0.19, 0.76, 0.27);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.17;
    const pupilR = pupilL.clone(); pupilR.position.x = 0.19;
    leftArm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), mat(accent));
    leftArm.scale.set(0.45, 0.9, 0.2); leftArm.position.set(-0.48, 0.05, 0);
    leftArm.geometry.translate(0, -0.22, 0);
    rightArm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), mat(accent));
    rightArm.scale.set(0.45, 0.9, 0.2); rightArm.position.set(0.48, 0.05, 0);
    rightArm.geometry.translate(0, -0.22, 0);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), mat(0xef9a9a));
    tail.position.set(0, -0.55, -0.2); tail.rotation.x = 0.5;
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8), mat(0xffa000));
    legL.position.set(-0.12, -0.6, 0);
    const legR = legL.clone(); legR.position.x = 0.12;
    group.add(body, head, beakTop, beakBot, eyeL, pupilL, eyeR, pupilR, leftArm, rightArm, tail, legL, legR);

  } else {
    // ghost
    body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), mat(color));
    body.scale.set(1, 1.1, 0.85);
    head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), mat(color));
    head.position.y = 0.75;
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat(0x1a1a2e, 0x7e57c2));
    eyeL.position.set(-0.14, 0.82, 0.33);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.14;
    leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.55, 8), mat(accent));
    leftArm.position.set(-0.48, 0.08, 0); leftArm.geometry.translate(0, -0.275, 0);
    rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.55, 8), mat(accent));
    rightArm.position.set(0.48, 0.08, 0); rightArm.geometry.translate(0, -0.275, 0);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 16, 16),
      new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.12, roughness: 1 })
    );
    glow.position.y = 0.1;
    group.add(glow, body, head, eyeL, eyeR, leftArm, rightArm);
  }

  group.position.y = -0.1;
  return { group, head, body, leftArm, rightArm };
}

// ─── ThreeCharacter ───────────────────────────────────────────────────────────

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

    const W = canvas.clientWidth || 280;
    const H = canvas.clientHeight || 280;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 20);
    camera.position.set(0, 0.2, 3.8);
    camera.lookAt(0, 0.2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(color, 0.4);
    fillLight.position.set(-2, 1, -1);
    scene.add(fillLight);

    const { group, head, body, leftArm, rightArm } = buildCharacter(characterId, color, accentColor);
    scene.add(group);

    const FREQ_BINS = 256;
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
        for (let i = 0; i < 4; i++) bass += freqData[i];
        bass = bass / 4 / 255;
        for (let i = 4; i < 40; i++) mid += freqData[i];
        mid = mid / 36 / 255;
        for (let i = 40; i < 100; i++) treble += freqData[i];
        treble = treble / 60 / 255;
      }

      const idle = Math.sin(t * 1.6) * 0.04;
      const rock = Math.sin(t * 0.9) * 0.03;

      group.position.y = -0.1 + bass * 0.18 + idle;
      body.position.y = bass * 0.3;
      body.scale.y = 1 + bass * 0.12;

      const swing = mid * 1.2 + (isActive ? 0 : 0.08 * Math.sin(t * 2));
      leftArm.rotation.z = swing + 0.1;
      rightArm.rotation.z = -(swing + 0.1);

      head.rotation.y = treble * 0.6 + rock;
      head.rotation.z = (treble - 0.5) * 0.15;
      head.scale.setScalar(1 + treble * 0.08);

      group.rotation.y += (isActive ? Math.sin(t * 2.2) * 0.08 + bass * 0.1 - group.rotation.y : -group.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      clearVAD();
      analyserRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (chunksRef.current.length > 0 && loopingRef.current) playAudio(blob);
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
      source.onended = () => {
        analyserRef.current = null;
        isActiveRef.current = false;
        if (loopingRef.current) startListening();
        else setPhase("idle");
      };
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
    // Character switch takes effect on next recording via selectedRef
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
