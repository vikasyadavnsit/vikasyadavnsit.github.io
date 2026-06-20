'use client';
import { useRef, useEffect, useCallback } from 'react';
import type { HandPos } from '../hooks/useHandTracking';
import {
  type Fruit, type SlashPoint, type ScorePopup,
  GRAVITY,
  spawnBunch, createCrackParts, createSlashParts,
  lineCircleIntersects,
} from '../lib/game';

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handPos: HandPos;
  playing: boolean;
  onFruitMissed: () => void;
  onFruitSlashed: (points: number) => void;
  onBombHit: () => void;
  onReady: () => void;
};
const MAX_ACTIVE = 8;
const TRAIL_DURATION_MS = 260;
const MIN_SWIPE_SPEED = 70;

// ── Audio synthesis helpers ────────────────────────────────────────────────

function getAudioCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext {
  if (!ref.current) ref.current = new AudioContext();
  if (ref.current.state === 'suspended') ref.current.resume();
  return ref.current;
}

function playNoiseBurst(actx: AudioContext, durationSec: number, bandHz: number, gain: number) {
  const len = Math.ceil(actx.sampleRate * durationSec);
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = actx.createBufferSource();
  src.buffer = buf;
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = bandHz; bp.Q.value = 1.2;
  const hp = actx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = bandHz * 0.4;
  const g = actx.createGain();
  g.gain.setValueAtTime(gain, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + durationSec);
  src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(actx.destination);
  src.start(); src.stop(actx.currentTime + durationSec);
}

function playSlashSound(actx: AudioContext) {
  playNoiseBurst(actx, 0.09, 3200, 0.55);
}

function playCrackSound(actx: AudioContext) {
  playNoiseBurst(actx, 0.05, 1600, 0.3);
}

function playBombSound(actx: AudioContext) {
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, actx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(28, actx.currentTime + 0.35);
  g.gain.setValueAtTime(0.7, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);
  osc.connect(g); g.connect(actx.destination);
  osc.start(); osc.stop(actx.currentTime + 0.4);
}

function playMissSound(actx: AudioContext) {
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(380, actx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, actx.currentTime + 0.22);
  g.gain.setValueAtTime(0.25, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
  osc.connect(g); g.connect(actx.destination);
  osc.start(); osc.stop(actx.currentTime + 0.25);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GameCanvas({
  videoRef, handPos, playing,
  onFruitMissed, onFruitSlashed, onBombHit, onReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const trailRef = useRef<SlashPoint[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const lastFrameRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(2400);
  const levelRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const playingRef = useRef(playing);
  const handPosRef = useRef<HandPos>(handPos);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { handPosRef.current = handPos; }, [handPos]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    onReady();
    return () => window.removeEventListener('resize', resize);
  }, [resize, onReady]);

  // Feed hand position into trail
  useEffect(() => {
    if (!handPos.isDetected) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    trailRef.current.push({ x: handPos.palmX * canvas.width, y: handPos.palmY * canvas.height, t: Date.now() });
    const cutoff = Date.now() - TRAIL_DURATION_MS;
    trailRef.current = trailRef.current.filter(p => p.t > cutoff);
  }, [handPos]);

  const resetGame = useCallback(() => {
    fruitsRef.current = [];
    trailRef.current = [];
    popupsRef.current = [];
    spawnTimerRef.current = 0;
    spawnIntervalRef.current = 2400;
    levelRef.current = 0;
    scoreRef.current = 0;
  }, []);

  useEffect(() => {
    if (playing) resetGame();
  }, [playing, resetGame]);

  // Expose miss sound so page.tsx can call it via the canvas ref indirectly
  const handleMiss = useCallback(() => {
    if (audioCtxRef.current || typeof AudioContext !== 'undefined') {
      try { playMissSound(getAudioCtx(audioCtxRef)); } catch { /* audio blocked */ }
    }
    onFruitMissed();
  }, [onFruitMissed]);

  const handleBomb = useCallback(() => {
    if (typeof AudioContext !== 'undefined') {
      try { playBombSound(getAudioCtx(audioCtxRef)); } catch { /* audio blocked */ }
    }
    onBombHit();
  }, [onBombHit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dt = Math.min((ts - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = ts;
      const W = canvas.width;
      const H = canvas.height;

      // ── Draw mirrored video background ──
      const video = videoRef.current;
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-W, 0);
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      if (!playingRef.current) return;

      // ── Spawn bunches ──
      spawnTimerRef.current += dt * 1000;
      const activeCount = fruitsRef.current.filter(f => !f.slashed).length;
      if (spawnTimerRef.current >= spawnIntervalRef.current && activeCount < MAX_ACTIVE) {
        spawnTimerRef.current = 0;
        const lvl = levelRef.current;
        const bunchSize = 2 + Math.floor(Math.random() * (lvl < 3 ? 2 : 3));
        fruitsRef.current.push(...spawnBunch(W, H, lvl, bunchSize));
        spawnIntervalRef.current = Math.max(1200, 2600 - lvl * 110);
      }

      // ── Physics update ──
      const toRemove: number[] = [];
      for (let i = 0; i < fruitsRef.current.length; i++) {
        const f = fruitsRef.current[i];
        if (f.slashed) {
          for (const p of f.parts) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += GRAVITY * 0.45 * dt;
            p.alpha -= dt * 2.2;
          }
          f.parts = f.parts.filter(p => p.alpha > 0);
          if (f.parts.length === 0) toRemove.push(i);
          continue;
        }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += GRAVITY * dt;
        f.rotation += f.rotSpeed * dt;
        if (f.y > H + 100) {
          if (!f.isBomb) handleMiss();
          toRemove.push(i);
        }
      }
      for (let i = toRemove.length - 1; i >= 0; i--) fruitsRef.current.splice(toRemove[i], 1);

      // ── Slash detection ──
      const trail = trailRef.current;
      if (trail.length >= 2) {
        const first = trail[0];
        const last = trail[trail.length - 1];
        const dtTrail = (last.t - first.t) / 1000 || 0.001;
        const speed = Math.hypot(last.x - first.x, last.y - first.y) / dtTrail;

        if (speed > MIN_SWIPE_SPEED) {
          for (const fruit of fruitsRef.current) {
            if (fruit.slashed) continue;
            let hit = false;
            for (let i = 0; i < trail.length - 1 && !hit; i++) {
              hit = lineCircleIntersects(trail[i].x, trail[i].y, trail[i + 1].x, trail[i + 1].y, fruit.x, fruit.y, fruit.radius);
            }
            if (!hit) continue;

            const actx = (typeof AudioContext !== 'undefined') ? getAudioCtx(audioCtxRef) : null;

            if (fruit.isBomb) {
              fruit.slashed = true;
              if (actx) try { playBombSound(actx); } catch { /* */ }
              handleBomb();
            } else if (!fruit.cracked) {
              // First hit — crack
              fruit.cracked = true;
              fruit.parts = createCrackParts(fruit);
              popupsRef.current.push({ x: fruit.x, y: fruit.y - fruit.radius, text: '+1', alpha: 1, vy: -160 });
              scoreRef.current += 1;
              levelRef.current = Math.floor(scoreRef.current / 10);
              if (actx) try { playCrackSound(actx); } catch { /* */ }
              onFruitSlashed(1);
            } else {
              // Second hit — destroy
              fruit.slashed = true;
              fruit.parts = createSlashParts(fruit);
              popupsRef.current.push({ x: fruit.x, y: fruit.y - fruit.radius, text: '+3', alpha: 1, vy: -180 });
              scoreRef.current += 3;
              levelRef.current = Math.floor(scoreRef.current / 10);
              if (actx) try { playSlashSound(actx); } catch { /* */ }
              onFruitSlashed(3);
            }
          }
        }
      }

      // ── Draw juice particles ──
      for (const fruit of fruitsRef.current) {
        if (fruit.parts.length === 0) continue;
        for (const p of fruit.parts) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        }
      }

      // ── Draw fruits ──
      for (const fruit of fruitsRef.current) {
        if (fruit.slashed) continue;
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        const scale = fruit.cracked ? 1.06 : 1;
        ctx.scale(scale, scale);
        ctx.font = `${fruit.radius * 1.7}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 10;
        ctx.fillText(fruit.emoji, 0, 0);

        // Crack overlay on first-hit fruits
        if (fruit.cracked) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = fruit.radius * 0.06;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-fruit.radius * 0.7, -fruit.radius * 0.25);
          ctx.lineTo(0, fruit.radius * 0.05);
          ctx.lineTo(fruit.radius * 0.7, -fruit.radius * 0.2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, fruit.radius * 0.05);
          ctx.lineTo(-fruit.radius * 0.15, fruit.radius * 0.55);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Draw rainbow slash trail ──
      if (trail.length >= 2) {
        const now = Date.now();
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < trail.length; i++) {
          const age = (now - trail[i].t) / TRAIL_DURATION_MS;
          const alpha = Math.max(0, 1 - age);
          const width = (1 - age) * 20 + 2;
          const hue = (now / 6 + i * 22) % 360;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${alpha * 0.95})`;
          ctx.lineWidth = width;
          ctx.shadowColor = `hsla(${hue}, 100%, 80%, ${alpha * 0.7})`;
          ctx.shadowBlur = 18;
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Draw score popups ──
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const p of popupsRef.current) {
        p.y += p.vy * dt;
        p.alpha -= dt * 2.0;
        ctx.globalAlpha = Math.max(0, p.alpha);
        const isBonus = p.text === '+3';
        ctx.font = `bold ${isBonus ? 48 : 36}px sans-serif`;
        ctx.fillStyle = isBonus ? '#ffd166' : '#ffffff';
        ctx.shadowColor = isBonus ? '#ff9900' : 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = isBonus ? 12 : 4;
        ctx.fillText(p.text, p.x, p.y);
      }
      popupsRef.current = popupsRef.current.filter(p => p.alpha > 0);
      ctx.restore();

      // ── Hand cursor dot ──
      const hp = handPosRef.current;
      if (hp.isDetected) {
        const hx = hp.palmX * W;
        const hy = hp.palmY * H;
        const hue = (Date.now() / 6) % 360;
        ctx.save();
        ctx.beginPath();
        ctx.arc(hx, hy, 14, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.25)`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, 0.9)`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsla(${hue}, 100%, 80%, 0.8)`;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef, onFruitSlashed, handleMiss, handleBomb]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
