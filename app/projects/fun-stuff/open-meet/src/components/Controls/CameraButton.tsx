import { useState } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useMediaStore } from '@/store/mediaStore'
import { DeviceSelector } from '@/components/Common/DeviceSelector'

export function CameraButton() {
  const { isCameraOn, isMirrored, videoDevices, toggle, switchCamera, setIsMirrored } = useCamera()
  const selectedCameraId = useMediaStore((s) => s.selectedCameraId)
  const [showSelector, setShowSelector] = useState(false)

  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          onClick={toggle}
          className={`p-3 rounded-xl transition-all ${
            isCameraOn
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? '📷' : '🚫'}
        </button>
        <button
          onClick={() => setShowSelector((v) => !v)}
          className="ml-0.5 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs"
          title="Select camera"
        >
          ▲
        </button>
      </div>
      {showSelector && (
        <div className="absolute bottom-full mb-2 left-0">
          <div className="glass rounded-xl shadow-xl border border-white/10 overflow-hidden min-w-[220px]">
            <DeviceSelector
              devices={videoDevices}
              selectedId={selectedCameraId}
              onSelect={switchCamera}
              onClose={() => setShowSelector(false)}
            />
            <button
              onClick={() => { setIsMirrored(!isMirrored); setShowSelector(false) }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors text-gray-200 border-t border-white/10"
            >
              {isMirrored ? '✓ ' : ''} Mirror video
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
