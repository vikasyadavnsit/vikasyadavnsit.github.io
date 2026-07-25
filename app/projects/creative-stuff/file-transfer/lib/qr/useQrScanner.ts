"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Generalized version of the rAF + <canvas> + jsQR scanning loop used in
// app/projects/creative-stuff/qr-login/page.tsx. Fires onDecode once per
// distinct consecutive decode — the same displayed QR frame is typically
// captured across many rAF ticks, so re-parsing identical consecutive text
// is wasted work. Real dedup against previously-seen chunk indices (across
// separate loop passes) is the caller's responsibility.

export interface UseQrScannerOptions {
  active: boolean;
  onDecode: (text: string) => void;
}

export function useQrScanner({ active, onDecode }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTextRef = useRef<string>("");
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "scanning">("idle");

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (result?.data && result.data !== lastTextRef.current) {
      lastTextRef.current = result.data;
      onDecodeRef.current(result.data);
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, []);

  const start = useCallback(async () => {
    setError("");
    setStatus("scanning");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;

      const attach = () => {
        if (!streamRef.current) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(scanFrame).catch(() => {});
        } else {
          requestAnimationFrame(attach);
        }
      };
      attach();
    } catch {
      setError("Camera permission denied or not available.");
      setStatus("idle");
    }
  }, [scanFrame]);

  useEffect(() => {
    if (active) start();
    else stop();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, canvasRef, error, status };
}
