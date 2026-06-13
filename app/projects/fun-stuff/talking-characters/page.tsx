"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Volume2, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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
    lottieFile: "/lottie/cat.json",
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
    lottieFile: "/lottie/dog.json",
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
    lottieFile: "/lottie/parrot.json",
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
    lottieFile: "/lottie/robot.json",
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
    lottieFile: "/lottie/ghost.json",
  },
] as const;

type CharacterId = typeof characters[number]["id"];
type Status = "idle" | "recording" | "processing" | "playing" | "error";

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

export default function TalkingCharactersPage() {
  const [selectedId, setSelectedId] = useState<CharacterId>("tomcat");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [lottieData, setLottieData] = useState<Record<string, object>>({});

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const selected = characters.find((c) => c.id === selectedId)!;

  useEffect(() => {
    characters.forEach(async (c) => {
      try {
        const res = await fetch(c.lottieFile);
        if (res.ok) {
          const json = await res.json();
          setLottieData((prev) => ({ ...prev, [c.id]: json }));
        }
      } catch { /* emoji fallback */ }
    });
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const playAudio = useCallback(async (blob: Blob) => {
    setStatus("processing");
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = new AudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = selected.playbackRate;
      sourceRef.current = source;

      let lastNode: AudioNode = source;

      // Apply EQ filter
      if ("filter" in selected && selected.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = selected.filter.type;
        filter.frequency.value = selected.filter.frequency;
        if (selected.filter.gain) filter.gain.value = selected.filter.gain;
        source.connect(filter);
        lastNode = filter;
      }

      // Robot distortion
      if ("distortion" in selected && selected.distortion) {
        const dist = createDistortion(ctx);
        lastNode.connect(dist);
        lastNode = dist;
      }

      // Ghost reverb
      if ("reverb" in selected && selected.reverb) {
        const reverb = createReverb(ctx);
        // Wet/dry mix: keep some dry signal
        const dry = ctx.createGain();
        dry.gain.value = 0.3;
        const wet = ctx.createGain();
        wet.gain.value = 0.85;
        lastNode.connect(dry);
        dry.connect(ctx.destination);
        lastNode.connect(reverb);
        reverb.connect(wet);
        wet.connect(ctx.destination);
        source.start();
        setStatus("playing");
        source.onended = () => { setStatus("idle"); ctx.close(); };
        return;
      }

      lastNode.connect(ctx.destination);
      source.start();
      setStatus("playing");
      source.onended = () => { setStatus("idle"); ctx.close(); };
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not process audio. Try again.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [selected]);

  const startRecording = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        playAudio(blob);
      };

      recorder.start();
      setStatus("recording");
    } catch {
      setErrorMsg("Microphone access denied. Please allow mic permissions.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const stopPlayback = () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setStatus("idle");
  };

  const handleMicClick = () => {
    if (status === "idle" || status === "error") {
      startRecording();
    } else if (status === "recording") {
      stopRecording();
    } else if (status === "playing") {
      stopPlayback();
    }
  };

  const switchCharacter = (id: CharacterId) => {
    if (status === "recording") stopRecording();
    if (status === "playing") stopPlayback();
    setSelectedId(id);
    setStatus("idle");
  };

  const isRecording = status === "recording";
  const isPlaying = status === "playing";
  const isProcessing = status === "processing";
  const isActive = isRecording || isPlaying || isProcessing;
  const lottieSrc = lottieData[selected.id];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-10 bg-gradient-to-br ${selected.gradient} transition-all duration-700`}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="self-start mb-12"
        >
          <Link
            href="/projects/fun-stuff"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back
          </Link>
        </motion.div>

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
            Speak — your voice echoes back in their style.
          </p>
        </motion.div>

        {/* Character selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mb-12 flex-wrap justify-center"
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

        {/* Character display */}
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative flex flex-col items-center mb-12"
        >
          <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
            {lottieSrc ? (
              <Lottie animationData={lottieSrc} loop className="w-full h-full" />
            ) : (
              <motion.span
                className="text-9xl select-none"
                animate={
                  isPlaying
                    ? { scale: [1, 1.08, 0.96, 1.06, 1], rotate: [-2, 2, -2, 2, 0] }
                    : isRecording
                    ? { scale: [1, 1.04, 1] }
                    : { scale: 1 }
                }
                transition={
                  isPlaying || isRecording
                    ? { repeat: Infinity, duration: 0.45 }
                    : {}
                }
              >
                {selected.emoji}
              </motion.span>
            )}

            {/* Ripple rings while playing */}
            <AnimatePresence>
              {isPlaying && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${selected.gradient} opacity-20`}
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{ scale: 1.6 + i * 0.3, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, delay: i * 0.3, repeat: Infinity }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Recording indicator */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-red-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                  <span className="text-xs text-red-400 font-medium">Recording</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-lg font-bold mt-6">{selected.name}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            {selected.label} voice
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-5 w-full"
        >
          <button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={`relative flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-base transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
              isRecording
                ? "bg-red-500 text-white shadow-xl shadow-red-500/40 scale-105"
                : isPlaying
                ? `bg-gradient-to-r ${selected.gradient} text-white shadow-xl ${selected.glow} scale-105`
                : `bg-gradient-to-r ${selected.gradient} text-white shadow-xl ${selected.glow} hover:scale-105 active:scale-95`
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 fill-current" />
                Stop Recording
              </>
            ) : isProcessing ? (
              <>
                <motion.div
                  className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                />
                Processing…
              </>
            ) : isPlaying ? (
              <>
                <Volume2 className="w-5 h-5" />
                Tap to Stop
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Tap to Speak
              </>
            )}

            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500"
                animate={{ scale: [1, 1.15], opacity: [0.35, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
          </button>

          {/* Error message */}
          <AnimatePresence>
            {status === "error" && errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground text-center"
            >
              {isRecording
                ? "Speak now… tap Stop when done"
                : isProcessing
                ? "Applying character voice…"
                : isPlaying
                ? `Playing as ${selected.name}…`
                : "Tap the button, say something, tap Stop"}
            </motion.p>
          </AnimatePresence>

          <p className="text-xs text-muted-foreground/50 text-center max-w-xs mt-2">
            Works offline · Your voice never leaves this device
          </p>
        </motion.div>
      </div>
    </main>
  );
}
