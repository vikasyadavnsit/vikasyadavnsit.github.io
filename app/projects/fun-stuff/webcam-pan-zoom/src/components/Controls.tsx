import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'

interface ControlsProps {
  zoomIn: ReactZoomPanPinchContentRef['zoomIn']
  zoomOut: ReactZoomPanPinchContentRef['zoomOut']
  resetTransform: ReactZoomPanPinchContentRef['resetTransform']
  centerView: ReactZoomPanPinchContentRef['centerView']
  scale: number
  mirrored: boolean
  onMirrorToggle: () => void
  toggleFullscreen: () => void
  isFullscreen: boolean
}

export function Controls({
  zoomIn,
  zoomOut,
  resetTransform,
  centerView,
  scale,
  mirrored,
  onMirrorToggle,
  toggleFullscreen,
  isFullscreen,
}: ControlsProps) {
  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    centerView(Number(e.target.value), 200, 'easeOut')
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Zoom out */}
      <ControlButton onClick={() => zoomOut(0.5, 200, 'easeOut')} title="Zoom out">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
        </svg>
      </ControlButton>

      {/* Zoom slider */}
      <div className="flex items-center gap-2 px-1">
        <input
          type="range"
          min={1}
          max={5}
          step={0.05}
          value={scale}
          onChange={handleSlider}
          className="w-28 sm:w-36 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${((scale - 1) / 4) * 100}%, rgba(255,255,255,0.15) ${((scale - 1) / 4) * 100}%)`,
          }}
        />
      </div>

      {/* Zoom in */}
      <ControlButton onClick={() => zoomIn(0.5, 200, 'easeOut')} title="Zoom in">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
        </svg>
      </ControlButton>

      <Divider />

      {/* Reset */}
      <ControlButton onClick={() => resetTransform(200, 'easeOut')} title="Reset view">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
        </svg>
      </ControlButton>

      {/* Mirror */}
      <ControlButton onClick={onMirrorToggle} title="Mirror" active={mirrored}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </ControlButton>

      {/* Fullscreen */}
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
  )
}

function ControlButton({
  onClick,
  title,
  active = false,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-violet-600 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-white/15 mx-1" />
}
