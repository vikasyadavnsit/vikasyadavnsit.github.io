'use client';
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Globe, Cloud, Layers, RotateCw, RefreshCw,
  Eye, EyeOff, X,
} from 'lucide-react';
import type { CountryInfo } from './components/EarthGlobe';

// Load Three.js component client-side only (no SSR)
const EarthGlobe = dynamic(() => import('./components/EarthGlobe'), { ssr: false });

function flagEmoji(iso: string): string {
  if (!iso || iso.length !== 2) return '🌍';
  return iso.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65),
  ).join('');
}

function formatPop(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

interface ToggleProps {
  icon: React.ElementType;
  offIcon?: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

function Toggle({ icon: Icon, offIcon: OffIcon, label, active, onClick }: ToggleProps) {
  const DisplayIcon = !active && OffIcon ? OffIcon : Icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 w-full
        ${active ? 'bg-white/15 text-white' : 'bg-transparent text-white/40 hover:text-white/60'}`}
    >
      <DisplayIcon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}

export default function EarthPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [showClouds, setShowClouds] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  const resetViewRef = useRef<(() => void) | null>(null);

  const handleApiReady = useCallback((api: { resetView: () => void }) => {
    resetViewRef.current = api.resetView;
  }, []);

  const handleReset = useCallback(() => {
    resetViewRef.current?.();
    setSelectedCountry(null);
  }, []);

  return (
    <main className="fixed inset-0 bg-[#0a0a0a] text-white overflow-hidden">
      {/* Three.js mount */}
      <EarthGlobe
        showClouds={showClouds}
        showAtmosphere={showAtmosphere}
        showLabels={showLabels}
        autoRotate={autoRotate}
        onCountrySelect={setSelectedCountry}
        onReady={() => setIsLoading(false)}
        onApiReady={handleApiReady}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-50"
          >
            <Globe className="w-16 h-16 text-blue-400 mb-6" style={{ animation: 'spin 2s linear infinite' }} />
            <p className="text-white/60 text-sm tracking-widest uppercase">Building Earth…</p>
            <p className="text-white/25 text-xs mt-2">Generating terrain · Loading geography</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back nav */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          href="/projects/fun-stuff"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm group"
        >
          <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          Fun Stuff
        </Link>
      </div>

      {/* Title bar */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none"
        >
          <p className="text-white/50 text-xs font-mono tracking-widest uppercase">Interactive Earth</p>
          <p className="text-white/20 text-xs mt-0.5">Drag · Scroll · Click country</p>
        </motion.div>
      )}

      {/* Country info panel */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="absolute top-1/2 -translate-y-1/2 right-6 z-30 w-64
                       bg-black/70 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-5"
          >
            <button
              onClick={() => setSelectedCountry(null)}
              className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-4xl mb-3">{flagEmoji(selectedCountry.iso)}</div>
            <h2 className="text-lg font-bold leading-tight mb-1">{selectedCountry.name}</h2>
            <p className="text-white/50 text-xs mb-4">{selectedCountry.continent}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Population</span>
                <span className="font-mono text-white/80">{formatPop(selectedCountry.population)}</span>
              </div>
            </div>

            <p className="text-white/20 text-xs mt-4 pt-3 border-t border-white/10">
              Zoom in to explore cities, rivers & mountains
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls panel */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-8 right-6 z-30 w-44
                     bg-black/65 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-3"
        >
          <div className="space-y-0.5">
            <Toggle icon={Cloud} label="Clouds" active={showClouds} onClick={() => setShowClouds(v => !v)} />
            <Toggle icon={Layers} label="Atmosphere" active={showAtmosphere} onClick={() => setShowAtmosphere(v => !v)} />
            <Toggle icon={Eye} offIcon={EyeOff} label="Labels" active={showLabels} onClick={() => setShowLabels(v => !v)} />
            <Toggle icon={RotateCw} label="Auto-rotate" active={autoRotate} onClick={() => setAutoRotate(v => !v)} />
          </div>

          <div className="mt-2 pt-2 border-t border-white/10">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium w-full
                         text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset View
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 px-3 pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-white/25 text-xs">100% offline</span>
          </div>
        </motion.div>
      )}
    </main>
  );
}
