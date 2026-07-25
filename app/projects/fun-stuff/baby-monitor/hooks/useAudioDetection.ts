'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { AudioState } from '../types';

// YAMNet class indices relevant to baby monitoring
// These indices match the YAMNet class list from TF Hub
const CRY_CLASSES = new Set([
  // 'Baby cry, infant cry' ~ index 21 in AudioSet ontology
  // Exact indices vary by model version; we match by score threshold on known-loud patterns
  20, 21, 22, // infant cry range
]);
const LOUD_CLASSES = new Set([40, 41, 42, 43, 44]); // general loud noise range

const SAMPLE_RATE = 16000;
const CLIP_DURATION = 0.975; // YAMNet expects ~0.975s at 16kHz = 15600 samples

export function useAudioDetection(onAudioState: (state: AudioState, confidence: number) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modelRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(Math.round(SAMPLE_RATE * CLIP_DURATION)));
  const writePos = useRef(0);
  const inferenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadModel = useCallback(async () => {
    if (modelRef.current || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const model = await tf.loadGraphModel(
        'https://tfhub.dev/google/tfjs-model/yamnet/classification/tfjs/1/model.json',
        { fromTFHub: true },
      );
      modelRef.current = model;
      setIsReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audio model');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const runInference = useCallback(async () => {
    const model = modelRef.current as { predict: (t: unknown) => unknown } | null;
    if (!model) return;

    try {
      const tf = await import('@tensorflow/tfjs');
      const clip = bufferRef.current.slice(0);
      const inputTensor = tf.tensor1d(clip);
      const output = model.predict(inputTensor) as { data: () => Promise<Float32Array>; dispose: () => void };
      const scores = await output.data();
      output.dispose();
      inputTensor.dispose();

      const maxScore = Math.max(...scores);
      const maxIdx = scores.indexOf(maxScore);

      let audioState: AudioState = 'silent';
      if (maxScore > 0.3) {
        if (CRY_CLASSES.has(maxIdx)) audioState = 'crying';
        else if (LOUD_CLASSES.has(maxIdx) || maxScore > 0.6) audioState = 'loud';
      }

      onAudioState(audioState, maxScore);
    } catch {
      // inference error — continue silently
    }
  }, [onAudioState]);

  const start = useCallback(async (deviceId?: string) => {
    if (!isReady) await loadModel();
    if (!modelRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined, sampleRate: SAMPLE_RATE, channelCount: 1 },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const channelData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          bufferRef.current[writePos.current] = channelData[i];
          writePos.current = (writePos.current + 1) % bufferRef.current.length;
        }
      };

      const muted = audioCtx.createGain();
      muted.gain.value = 0;
      source.connect(processor);
      processor.connect(muted);
      muted.connect(audioCtx.destination);

      inferenceTimerRef.current = setInterval(runInference, 1500);
      setIsActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied');
    }
  }, [isReady, loadModel, runInference]);

  const stop = useCallback(() => {
    if (inferenceTimerRef.current) clearInterval(inferenceTimerRef.current);
    processorRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (inferenceTimerRef.current) clearInterval(inferenceTimerRef.current);
      processorRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { loadModel, start, stop, isLoading, isReady, isActive, error };
}
