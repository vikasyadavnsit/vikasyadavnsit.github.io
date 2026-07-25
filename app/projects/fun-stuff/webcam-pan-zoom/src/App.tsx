import { useState, useCallback } from 'react'
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'
import { useWebcam } from './hooks/useWebcam'
import { Toolbar } from './components/Toolbar'
import { WebcamViewer } from './components/WebcamViewer'
import { Controls } from './components/Controls'

export default function App() {
  const [scale, setScale] = useState(1)
  const { permission, retry, mirrored, setMirrored, isFullscreen, toggleFullscreen, containerRef } = useWebcam()

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
  )

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-black relative overflow-hidden"
    >
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
            <WebcamViewer
              mirrored={mirrored}
              onScaleChange={setScale}
              renderControls={renderControls}
            />
          </div>
        </>
      )}
    </div>
  )
}
