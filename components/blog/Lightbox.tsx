"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out animate-in fade-in duration-200"
    >
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ""}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default"
      />
    </div>
  );
}
