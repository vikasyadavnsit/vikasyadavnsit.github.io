'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { BoundingBox, PoseLandmark, BabyState, DetectionResult } from '../types';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const OD_MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Pose landmark indices (MediaPipe 33-point model)
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

function avgY(lms: PoseLandmark[], ...indices: number[]): number {
  const visible = indices.filter(i => (lms[i]?.visibility ?? 0) > 0.3);
  if (!visible.length) return 0;
  return visible.reduce((s, i) => s + lms[i].y, 0) / visible.length;
}

function landmarkMovement(prev: PoseLandmark[], curr: PoseLandmark[]): number {
  let total = 0;
  const count = Math.min(prev.length, curr.length);
  for (let i = 0; i < count; i++) {
    const dx = curr[i].x - prev[i].x;
    const dy = curr[i].y - prev[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return count > 0 ? total / count : 0;
}

function measureBrightness(video: HTMLVideoElement): number {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 9;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 1;
    ctx.drawImage(video, 0, 0, 16, 9);
    const data = ctx.getImageData(0, 0, 16, 9).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    return sum / (data.length / 4) / 255;
  } catch {
    return 1;
  }
}

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onResult: (result: DetectionResult) => void,
  movementSensitivity: number = 3,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const odRef = useRef<unknown>(null);
  const poseRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const prevLandmarksRef = useRef<PoseLandmark[] | null>(null);

  // Movement accumulator for sleep/active detection
  const movBuckets = useRef<number[]>([]);

  // Throttle: run inference at most every 100ms (10fps max)
  const INFERENCE_INTERVAL_MS = 100;
  const lastInferenceTs = useRef<number>(0);

  // Brightness check counter
  const brightnessFrameCount = useRef<number>(0);

  // Visibility tracking
  const lastVisibleTs = useRef<number>(Date.now());

  const init = useCallback(async () => {
    if (isReady || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const { FilesetResolver, ObjectDetector, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

      const [od, pose] = await Promise.all([
        ObjectDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: OD_MODEL, delegate: 'GPU' },
          scoreThreshold: 0.4,
          maxResults: 1,
          categoryAllowlist: ['person'],
          runningMode: 'VIDEO',
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4,
        }),
      ]);

      odRef.current = od;
      poseRef.current = pose;
      setIsReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI models');
    } finally {
      setIsLoading(false);
    }
  }, [isReady, isLoading]);

  const startDetection = useCallback(() => {
    if (!odRef.current || !poseRef.current || !videoRef.current) return;

    const detect = (ts: number) => {
      // Always reschedule first so RAF keeps running even if we skip this frame
      rafRef.current = requestAnimationFrame(detect);

      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      // Throttle inference to max 10fps — heavy ML should not run at 60fps
      if (ts - lastInferenceTs.current < INFERENCE_INTERVAL_MS) return;
      lastInferenceTs.current = ts;

      const od = odRef.current as { detectForVideo: (v: HTMLVideoElement, t: number) => { detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number }; categories: Array<{ score: number }> }> } } | null;
      const pose = poseRef.current as { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: PoseLandmark[][] } } | null;

      if (!od || !pose) return;

      let boundingBox: BoundingBox | null = null;
      let poseLandmarks: PoseLandmark[] | null = null;
      let isCameraBlocked = false;
      let isLowLight = false;
      let babyState: BabyState = 'not_visible';

      try {
        const odResult = od.detectForVideo(video, ts);
        const det = odResult.detections[0];
        if (det?.boundingBox) {
          const vw = video.videoWidth || 1;
          const vh = video.videoHeight || 1;
          boundingBox = {
            x: det.boundingBox.originX / vw,
            y: det.boundingBox.originY / vh,
            w: det.boundingBox.width / vw,
            h: det.boundingBox.height / vh,
            confidence: det.categories[0]?.score ?? 0,
          };
          lastVisibleTs.current = Date.now();
        }
      } catch { /* detection failed */ }

      try {
        const poseResult = pose.detectForVideo(video, ts);
        poseLandmarks = poseResult.landmarks[0] ?? null;
      } catch { /* pose failed */ }

      // Low-light check every ~30 inference frames (not every RAF frame)
      brightnessFrameCount.current++;
      if (brightnessFrameCount.current % 30 === 0) {
        const brightness = measureBrightness(video);
        isLowLight = brightness < 0.08;
        isCameraBlocked = brightness < 0.02;
      }

      // Sleep/activity detection via landmark movement
      if (poseLandmarks) {
        if (prevLandmarksRef.current) {
          const mov = landmarkMovement(prevLandmarksRef.current, poseLandmarks);
          movBuckets.current.push(mov);
          if (movBuckets.current.length > 30) movBuckets.current.shift();
        }
        prevLandmarksRef.current = poseLandmarks;

        const avg = movBuckets.current.reduce((s, v) => s + v, 0) / (movBuckets.current.length || 1);
        const sleepThreshold = 0.002 / movementSensitivity;
        const restlessThreshold = sleepThreshold * 3;

        if (avg < sleepThreshold) babyState = 'sleeping';
        else if (avg < restlessThreshold) babyState = 'restless';
        else babyState = 'active';

        // Fall detection: shoulders significantly lower than hips
        if (poseLandmarks.length > 24) {
          const shoulderY = avgY(poseLandmarks, LEFT_SHOULDER, RIGHT_SHOULDER);
          const hipY = avgY(poseLandmarks, LEFT_HIP, RIGHT_HIP);
          if (shoulderY > 0 && hipY > 0 && shoulderY > hipY - 0.05) {
            babyState = 'active'; // override — fall candidate handled by caller
          }
        }
      } else if (boundingBox) {
        babyState = 'active';
      }

      onResult({ boundingBox, poseLandmarks, babyState, isLowLight, isCameraBlocked });
    };

    rafRef.current = requestAnimationFrame(detect);
  }, [isReady, videoRef, onResult, movementSensitivity]);

  const stopDetection = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  return { init, startDetection, stopDetection, isLoading, isReady, error };
}
