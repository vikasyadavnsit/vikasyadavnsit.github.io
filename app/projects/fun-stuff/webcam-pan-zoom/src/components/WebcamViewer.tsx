import type { ReactNode } from 'react'
import type { ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import Webcam from 'react-webcam'

interface WebcamViewerProps {
  mirrored: boolean
  onScaleChange: (scale: number) => void
  renderControls: (ref: ReactZoomPanPinchContentRef) => ReactNode
}

export function WebcamViewer({ mirrored, onScaleChange, renderControls }: WebcamViewerProps) {
  return (
    <div className="w-full h-full overflow-hidden touch-none">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={5}
        doubleClick={{ mode: 'reset' }}
        onTransform={(_ref, state) => onScaleChange(state.scale)}
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
  )
}
