'use client';
import { useRef, useState, useCallback, useEffect } from 'react';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type HandPos = { palmX: number; palmY: number; isDetected: boolean };

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onResult: (pos: HandPos) => void,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const INTERVAL_MS = 33; // ~30fps

  const init = useCallback(async () => {
    if (isReady || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const hand = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      handRef.current = hand;
      setIsReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hand tracking model');
    } finally {
      setIsLoading(false);
    }
  }, [isReady, isLoading]);

  const startTracking = useCallback(() => {
    const detect = (ts: number) => {
      rafRef.current = requestAnimationFrame(detect);
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      if (ts - lastTsRef.current < INTERVAL_MS) return;
      lastTsRef.current = ts;

      const hand = handRef.current as {
        detectForVideo: (v: HTMLVideoElement, t: number) => {
          landmarks: Array<Array<{ x: number; y: number; z: number }>>;
        };
      } | null;
      if (!hand) return;

      try {
        const result = hand.detectForVideo(video, ts);
        const lm = result.landmarks[0];
        if (lm && lm.length > 9) {
          // Landmark 9: middle finger MCP — stable palm center
          // Mirror X since video is mirrored
          onResult({ palmX: 1 - lm[9].x, palmY: lm[9].y, isDetected: true });
        } else {
          onResult({ palmX: 0, palmY: 0, isDetected: false });
        }
      } catch {
        onResult({ palmX: 0, palmY: 0, isDetected: false });
      }
    };
    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef, onResult]);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, []);

  return { init, startTracking, stopTracking, isLoading, isReady, error };
}
