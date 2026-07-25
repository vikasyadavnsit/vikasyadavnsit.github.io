'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Camera, CameraOff, Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import { useHandTracking, type HandPos } from './hooks/useHandTracking';
import GameCanvas from './components/GameCanvas';

type GameState = 'permission' | 'loading' | 'start' | 'calibrate' | 'playing' | 'gameover';

const MAX_LIVES = 3;
const HAND_CONFIRM_MS = 500; // ms hand must be visible before enabling Play

export default function FruitNinjaPage() {
  const [gameState, setGameState] = useState<GameState>('permission');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [highScore, setHighScore] = useState(0);
  const [handPos, setHandPos] = useState<HandPos>({ palmX: 0, palmY: 0, isDetected: false });
  const [handReady, setHandReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const livesRef = useRef(MAX_LIVES);
  const handDetectedSinceRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onHandResult = useCallback((pos: HandPos) => setHandPos(pos), []);
  const { init, startTracking, stopTracking, isLoading, isReady, error: trackingError } = useHandTracking(videoRef, onHandResult);

  const startCamera = useCallback(() => {
    setGameState('loading');
    setCameraError(null);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        init();
      })
      .catch(() => {
        setGameState('permission');
        setCameraError(
          'Camera access was denied. To play, allow camera access in your browser settings and refresh.'
        );
      });
  }, [init]);

  // On mount: if permission already granted, skip the request screen
  useEffect(() => {
    if (!navigator.mediaDevices) return;
    navigator.permissions.query({ name: 'camera' as PermissionName })
      .then(result => { if (result.state === 'granted') startCamera(); })
      .catch(() => { /* permissions API not supported — wait for user click */ });
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReady && gameState === 'loading') setGameState('start');
  }, [isReady, gameState]);

  useEffect(() => {
    if (trackingError) setCameraError(trackingError);
  }, [trackingError]);

  // Track hand detection stability during calibration
  useEffect(() => {
    if (gameState !== 'calibrate') return;
    if (handPos.isDetected) {
      if (!handDetectedSinceRef.current) handDetectedSinceRef.current = Date.now();
      const elapsed = Date.now() - handDetectedSinceRef.current;
      if (elapsed >= HAND_CONFIRM_MS && !handReady) setHandReady(true);
    } else {
      handDetectedSinceRef.current = null;
      setHandReady(false);
      setCountdown(null);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
  }, [handPos, gameState, handReady]);

  // Auto-start countdown once hand is ready
  useEffect(() => {
    if (!handReady || gameState !== 'calibrate') return;
    if (countdownTimerRef.current) return; // already counting
    setCountdown(3);
    let c = 3;
    countdownTimerRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        startPlaying();
      }
    }, 1000);
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handReady, gameState]);

  const enterCalibrate = useCallback(() => {
    setHandReady(false);
    handDetectedSinceRef.current = null;
    setCountdown(null);
    setGameState('calibrate');
    startTracking();
  }, [startTracking]);

  const startPlaying = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setScore(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setGameState('playing');
  }, []);

  const endGame = useCallback((finalScore: number) => {
    setGameState('gameover');
    stopTracking();
    setHighScore(prev => Math.max(prev, finalScore));
  }, [stopTracking]);

  const handleFruitMissed = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      setScore(prev => { endGame(prev); return prev; });
    }
  }, [endGame]);

  const handleFruitSlashed = useCallback((points: number) => {
    setScore(prev => prev + points);
  }, []);

  const handleBombHit = useCallback(() => {
    setScore(prev => { endGame(prev); return prev; });
  }, [endGame]);

  const playAgain = useCallback(() => {
    setHandReady(false);
    handDetectedSinceRef.current = null;
    setCountdown(null);
    setGameState('calibrate');
    startTracking();
  }, [startTracking]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Back nav — hidden during active gameplay to avoid HUD overlap */}
      {gameState !== 'playing' && (
        <div className="absolute top-6 left-6 z-50">
          <Link
            href="/projects/fun-stuff"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Fun Stuff
          </Link>
        </div>
      )}

      {/* Permission request / denied screen */}
      {gameState === 'permission' && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6 max-w-sm">
            <div className={`p-5 rounded-full ${cameraError ? 'bg-red-500/15' : 'bg-white/10'}`}>
              {cameraError ? <CameraOff className="w-14 h-14 text-red-400" /> : <Camera className="w-14 h-14 text-white/70" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {cameraError ? 'Camera access denied' : 'Camera access needed'}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                {cameraError
                  ? 'Click the camera icon in your browser\'s address bar, allow access, then try again.'
                  : 'This game tracks your hand movements using your webcam. Nothing is recorded or sent anywhere — everything runs 100% in your browser.'}
              </p>
            </div>
            {!cameraError && (
              <button onClick={startCamera}
                className="w-full py-3 px-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-red-500/25">
                Enable Camera
              </button>
            )}
            {cameraError && (
              <button onClick={startCamera}
                className="w-full py-3 px-8 bg-white/10 hover:bg-white/20 rounded-full font-bold transition-colors">
                Try Again
              </button>
            )}
            <p className="text-white/30 text-xs flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> Your camera feed never leaves this page
            </p>
          </motion.div>
        </div>
      )}

      {gameState !== 'permission' && (
        <div className="relative w-full h-screen">
          <video ref={videoRef} playsInline muted autoPlay className="absolute opacity-0 pointer-events-none" />

          <div className="relative w-full h-full">
            <GameCanvas
              videoRef={videoRef}
              handPos={handPos}
              playing={gameState === 'playing'}
              onFruitMissed={handleFruitMissed}
              onFruitSlashed={handleFruitSlashed}
              onBombHit={handleBombHit}
              onReady={() => {}}
            />

            {/* HUD during gameplay */}
            {gameState === 'playing' && (
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-10">
                <div className="bg-black/50 backdrop-blur-md rounded-2xl px-4 py-2 min-w-[90px]">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none mb-1">Score</p>
                  <p className="text-3xl font-bold tabular-nums leading-none">{score}</p>
                </div>
                <div className="bg-black/50 backdrop-blur-md rounded-2xl px-4 py-2 flex gap-1.5 items-center">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <Heart key={i} className={`w-6 h-6 transition-all ${i < lives ? 'text-red-400 fill-red-400' : 'text-white/20'}`} />
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {/* Loading */}
              {gameState === 'loading' && (
                <motion.div key="loading" initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-orange-400" />
                  <p className="text-white/70">Loading hand tracking model…</p>
                </motion.div>
              )}

              {/* Start screen */}
              {gameState === 'start' && (
                <motion.div key="start"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm z-20 gap-8">
                  <div className="text-center">
                    <p className="text-7xl mb-4">🍉🍊🍋</p>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-3">Fruit Ninja</h1>
                    <p className="text-white/60 text-lg">Wave your hand to slash fruits. Avoid the bombs!</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center max-w-sm">
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-2xl mb-1">✋</p>
                      <p className="text-xs text-white/60">Swipe hand<br />to slash</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-2xl mb-1">💣</p>
                      <p className="text-xs text-white/60">Avoid<br />bombs</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-2xl mb-1">❤️</p>
                      <p className="text-xs text-white/60">3 lives —<br />don't miss!</p>
                    </div>
                  </div>
                  {highScore > 0 && <p className="text-white/40 text-sm">Best: {highScore}</p>}
                  <button onClick={enterCalibrate}
                    className="px-10 py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-lg font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-red-500/30">
                    Get Ready →
                  </button>
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Camera className="w-3 h-3" />
                    100% offline — nothing leaves your device
                  </div>
                </motion.div>
              )}

              {/* Calibration screen */}
              {gameState === 'calibrate' && (
                <motion.div key="calibrate"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-6 px-4"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)' }}>

                  <h2 className="text-3xl font-bold tracking-tight">Camera Setup</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {/* Distance guide */}
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                      <h3 className="font-semibold text-white text-lg">Set up your space</h3>

                      {/* Person + distance SVG */}
                      <div className="flex items-center justify-center py-2">
                        <svg width="180" height="90" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Person silhouette */}
                          <circle cx="138" cy="18" r="10" fill="rgba(255,255,255,0.6)" />
                          <rect x="128" y="30" width="20" height="26" rx="4" fill="rgba(255,255,255,0.6)" />
                          <rect x="122" y="32" width="10" height="18" rx="3" fill="rgba(255,255,255,0.4)" />
                          <rect x="146" y="32" width="10" height="18" rx="3" fill="rgba(255,255,255,0.4)" />
                          <rect x="130" y="56" width="8" height="22" rx="3" fill="rgba(255,255,255,0.6)" />
                          <rect x="140" y="56" width="8" height="22" rx="3" fill="rgba(255,255,255,0.6)" />
                          {/* Screen */}
                          <rect x="4" y="22" width="44" height="34" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                          <rect x="20" y="56" width="12" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
                          <rect x="14" y="62" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
                          {/* Arrow */}
                          <line x1="52" y1="39" x2="120" y2="39" stroke="rgba(255,120,50,0.8)" strokeWidth="1.5" strokeDasharray="4 3" />
                          <polygon points="50,39 56,35 56,43" fill="rgba(255,120,50,0.8)" />
                          <polygon points="122,39 116,35 116,43" fill="rgba(255,120,50,0.8)" />
                          <text x="86" y="34" textAnchor="middle" fill="rgba(255,120,50,0.9)" fontSize="9" fontFamily="sans-serif">arm's length</text>
                        </svg>
                      </div>

                      <ul className="space-y-2 text-sm text-white/70">
                        <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">•</span>Sit about arm's length from your screen</li>
                        <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">•</span>Your upper body should be visible in the camera</li>
                        <li className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">•</span>Good lighting helps — face a window or lamp</li>
                      </ul>
                    </div>

                    {/* Live hand detection */}
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col gap-4 items-center justify-between">
                      <h3 className="font-semibold text-white text-lg self-start">Hand check</h3>

                      <div className="flex flex-col items-center gap-3 flex-1 justify-center">
                        {/* Detection indicator */}
                        <div className="relative flex items-center justify-center w-24 h-24">
                          {handPos.isDetected ? (
                            <>
                              <motion.div
                                className="absolute inset-0 rounded-full bg-green-500/20"
                                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              />
                              <CheckCircle2 className="w-12 h-12 text-green-400" />
                            </>
                          ) : (
                            <>
                              <motion.div
                                className="absolute inset-0 rounded-full bg-amber-500/20"
                                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                              />
                              <AlertCircle className="w-12 h-12 text-amber-400" />
                            </>
                          )}
                        </div>

                        <p className={`font-semibold text-lg transition-colors ${handPos.isDetected ? 'text-green-400' : 'text-amber-400'}`}>
                          {handPos.isDetected ? 'Hand detected! ✅' : 'Raise your hand ✋'}
                        </p>
                        <p className="text-white/50 text-xs text-center">
                          {handPos.isDetected
                            ? handReady
                              ? countdown !== null ? `Starting in ${countdown}…` : 'Ready!'
                              : 'Hold still a moment…'
                            : 'Move your hand into view and hold it steady'}
                        </p>
                      </div>

                      {/* Play button */}
                      <button
                        onClick={startPlaying}
                        disabled={!handReady}
                        className={`w-full py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${
                          handReady
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105 active:scale-95 shadow-lg shadow-green-500/30 cursor-pointer'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        {countdown !== null ? `Starting in ${countdown}…` : handReady ? 'Play Now! 🎮' : 'Waiting for hand…'}
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setGameState('start')} className="text-white/40 text-sm hover:text-white/70 transition-colors">
                    ← Back to instructions
                  </button>
                </motion.div>
              )}

              {/* Game over */}
              {gameState === 'gameover' && (
                <motion.div key="gameover"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20 gap-6">
                  <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }} className="text-6xl">
                    {score >= 20 ? '🏆' : score >= 10 ? '🎯' : '😅'}
                  </motion.p>
                  <div className="text-center">
                    <h2 className="text-5xl font-bold mb-2">Game Over</h2>
                    <p className="text-white/60">
                      {score === 0 ? 'Keep practicing!' : score < 10 ? 'Nice try!' : score < 20 ? 'Great slicing!' : 'Ninja master!'}
                    </p>
                  </div>
                  <div className="flex gap-8 text-center">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Score</p>
                      <p className="text-5xl font-bold text-orange-400">{score}</p>
                    </div>
                    {highScore > 0 && (
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Best</p>
                        <p className="text-5xl font-bold text-white/50">{highScore}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={playAgain}
                      className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform">
                      Play Again
                    </button>
                    <Link href="/projects/fun-stuff"
                      className="px-8 py-3 bg-white/10 rounded-full font-bold hover:bg-white/20 transition-colors">
                      Exit
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>
  );
}
