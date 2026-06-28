'use client';

import { useState, useCallback } from 'react';
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Webcam from 'react-webcam';
import { useWebcam } from './src/hooks/useWebcam';

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ scale }: { scale: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-black/50 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span className="text-white font-semibold text-sm tracking-tight">Webcam Pan &amp; Zoom</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-white/50 text-xs">Zoom</span>
        <span className="bg-violet-500/20 text-violet-300 text-xs px-2.5 py-1 rounded-full font-mono tabular-nums border border-violet-500/30">
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────

interface ControlsProps {
  zoomIn: ReactZoomPanPinchContentRef['zoomIn'];
  zoomOut: ReactZoomPanPinchContentRef['zoomOut'];
  resetTransform: ReactZoomPanPinchContentRef['resetTransform'];
  centerView: ReactZoomPanPinchContentRef['centerView'];
  scale: number;
  mirrored: boolean;
  onMirrorToggle: () => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
}

function ControlButton({
  onClick, title, active = false, children,
}: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer ${
        active ? 'bg-violet-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Controls({ zoomIn, zoomOut, resetTransform, centerView, scale, mirrored, onMirrorToggle, toggleFullscreen, isFullscreen }: ControlsProps) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl"
      onPointerDown={e => e.stopPropagation()}
    >
      <ControlButton onClick={() => zoomOut(0.5, 200, 'easeOut')} title="Zoom out">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
        </svg>
      </ControlButton>

      <div className="flex items-center gap-2 px-1">
        <input
          type="range"
          min={1}
          max={5}
          step={0.05}
          value={scale}
          onChange={e => centerView(Number(e.target.value), 200, 'easeOut')}
          className="w-28 sm:w-36 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${((scale - 1) / 4) * 100}%, rgba(255,255,255,0.15) ${((scale - 1) / 4) * 100}%)`,
          }}
        />
      </div>

      <ControlButton onClick={() => zoomIn(0.5, 200, 'easeOut')} title="Zoom in">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
        </svg>
      </ControlButton>

      <div className="w-px h-5 bg-white/15 mx-1" />

      <ControlButton onClick={() => resetTransform(200, 'easeOut')} title="Reset view">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
        </svg>
      </ControlButton>

      <ControlButton onClick={onMirrorToggle} title="Mirror" active={mirrored}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </ControlButton>

      <ControlButton onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        {isFullscreen ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5m10.5 0V4.5M15 9h4.5M9 15v4.5M9 15H4.5m10.5 0v4.5M15 15h4.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </ControlButton>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WebcamPanZoomPage() {
  const [scale, setScale] = useState(1);
  const { permission, retry, mirrored, setMirrored, isFullscreen, toggleFullscreen, containerRef } = useWebcam();

  const renderControls = useCallback(
    (controls: ReactZoomPanPinchContentRef) => (
      <Controls
        zoomIn={controls.zoomIn}
        zoomOut={controls.zoomOut}
        resetTransform={controls.resetTransform}
        centerView={controls.centerView}
        scale={scale}
        mirrored={mirrored}
        onMirrorToggle={() => setMirrored(m => !m)}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />
    ),
    [scale, mirrored, setMirrored, toggleFullscreen, isFullscreen],
  );

  return (
    <div ref={containerRef} className="w-screen h-screen bg-black relative overflow-hidden">
      {permission === 'pending' && (
        <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-white">
          <div className="w-10 h-10 border-2 border-white/20 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Requesting camera access…</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="flex flex-col items-center justify-center w-full h-full px-4">
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-950/60 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Camera access denied</h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Please allow camera access in your browser settings and try again.
            </p>
            <button
              onClick={retry}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm py-2.5 rounded-xl transition-colors duration-150 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {permission === 'granted' && (
        <>
          <Toolbar scale={scale} />
          <div className="w-full h-full pt-10">
            <div className="w-full h-full overflow-hidden touch-none">
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={5}
                doubleClick={{ mode: 'reset' }}
                onTransform={(_ref, state) => setScale(state.scale)}
                smooth
                limitToBounds
              >
                {(controls) => (
                  <>
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ width: '100%', height: '100%' }}
                    >
                      <Webcam
                        mirrored={mirrored}
                        audio={false}
                        videoConstraints={{
                          facingMode: 'user',
                          width: { ideal: 1920 },
                          height: { ideal: 1080 },
                          frameRate: { ideal: 30 },
                        }}
                        className="w-full h-full object-contain block"
                        style={{ display: 'block', imageRendering: 'auto' }}
                      />
                    </TransformComponent>
                    {renderControls(controls)}
                  </>
                )}
              </TransformWrapper>
            </div>
          </div>
        </>
      )}

      <style>{`
        input[type='range'] { -webkit-appearance: none; appearance: none; outline: none; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: #7c3aed; border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 0 0 2px rgba(124,58,237,0.4); transition: box-shadow 0.15s;
        }
        input[type='range']::-webkit-slider-thumb:hover { box-shadow: 0 0 0 4px rgba(124,58,237,0.3); }
        input[type='range']::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #7c3aed; border: 2px solid rgba(255,255,255,0.9);
        }
      `}</style>
    </div>
  );
}
