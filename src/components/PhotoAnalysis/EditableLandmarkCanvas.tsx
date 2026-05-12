import { useEffect, useMemo, useRef, useState } from 'react'
import { ManualLandmarkInput, PhotoSideView } from '../../services/photoAnalysisApi'

interface DragState {
  landmarkId: number
  panel: 'front' | 'side'
}

interface EditableLandmarkCanvasProps {
  title: string
  imageUrl: string | null
  landmarks: ManualLandmarkInput[]
  panel: 'front' | 'side'
  sideView: PhotoSideView
  selectedLandmarkId: number | null
  onSelect: (landmarkId: number) => void
  onChange: (next: ManualLandmarkInput[]) => void
  onImageSizeChange?: (size: { width: number; height: number }) => void
}

export const FRONT_EDIT_IDS = [0, 11, 12, 23, 24]
export const C7_LANDMARK_ID = 33
export const LEFT_SIDE_EDIT_IDS = [7, C7_LANDMARK_ID, 11, 23]
export const RIGHT_SIDE_EDIT_IDS = [8, C7_LANDMARK_ID, 12, 24]
const FRONT_CONNECTIONS = [
  [0, 11], [0, 12], [11, 12], [11, 23], [12, 24], [23, 24],
]
const SIDE_CONNECTIONS = [
  [7, C7_LANDMARK_ID], [C7_LANDMARK_ID, 11], [11, 23],
  [8, C7_LANDMARK_ID], [C7_LANDMARK_ID, 12], [12, 24],
]
const LANDMARK_LABELS: Record<number, string> = {
  0: '머리',
  7: '머리',
  8: '머리',
  33: '경추',
  11: '왼쪽 어깨',
  12: '오른쪽 어깨',
  23: '왼쪽 골반',
  24: '오른쪽 골반',
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function toImageX(value: number, imageWidth: number) {
  return value * imageWidth
}

function toImageY(value: number, imageHeight: number) {
  return value * imageHeight
}

export default function EditableLandmarkCanvas({
                                  title,
                                  imageUrl,
                                  landmarks,
                                  panel,
                                  sideView,
                                  selectedLandmarkId,
                                  onSelect,
                                  onChange,
                                  onImageSizeChange,
                                }: EditableLandmarkCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const [imageSize, setImageSize] = useState({ width: 4, height: 5 })
  const [frameSize, setFrameSize] = useState({ width: 4, height: 5 })

  const editableIds = useMemo(() => {
    if (panel === 'front') {
      return FRONT_EDIT_IDS
    }

    return sideView === 'left' ? LEFT_SIDE_EDIT_IDS : RIGHT_SIDE_EDIT_IDS
  }, [panel, sideView])

  const visibleLandmarks = useMemo(
      () => landmarks.filter((landmark) => editableIds.includes(landmark.id)),
      [editableIds, landmarks]
  )

  const visibleConnections = useMemo(
      () => (panel === 'front' ? FRONT_CONNECTIONS : SIDE_CONNECTIONS).filter(
          ([startId, endId]) => editableIds.includes(startId) && editableIds.includes(endId)
      ),
      [editableIds, panel]
  )

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      const frame = frameRef.current
      if (!dragState || !frame) {
        return
      }

      const rect = frame.getBoundingClientRect()
      const nextX = clamp((event.clientX - rect.left) / rect.width)
      const nextY = clamp((event.clientY - rect.top) / rect.height)

      onChange(
          landmarks.map((landmark) =>
              landmark.id === dragState.landmarkId
                  ? {
                    ...landmark,
                    x: Number(nextX.toFixed(6)),
                    y: Number(nextY.toFixed(6)),
                    visibility: Math.max(landmark.visibility, 0.2),
                  }
                  : landmark
          )
      )
    }

    const handlePointerUp = () => {
      dragStateRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [landmarks, onChange])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) {
      return
    }

    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ width: rect.width, height: rect.height })
      }
    }

    updateFrameSize()

    const resizeObserver = new ResizeObserver(updateFrameSize)
    resizeObserver.observe(frame)

    return () => {
      resizeObserver.disconnect()
    }
  }, [imageUrl])

  const overlayUnit = Math.min(imageSize.width, imageSize.height) / 100
  const svgUnitsPerScreenPixel = frameSize.width > 0 ? imageSize.width / frameSize.width : 1
  const lineWidth = 0.35 * overlayUnit
  const pointStrokeWidth = 0.35 * overlayUnit
  const pointRadius = 1.15 * overlayUnit
  const selectedPointRadius = 1.55 * overlayUnit
  const labelOffset = 1.5 * overlayUnit
  const labelFontSize = 14 * svgUnitsPerScreenPixel

  return (
      <section className="card">
        <div className="photo-editor-header">
          <h3>{title}</h3>
        </div>
        <div className="photo-editor-stage">
          {imageUrl ? (
              <div
                  ref={frameRef}
                  className="photo-editor-frame"
                  style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}
              >
                <svg
                    className="photo-editor-overlay"
                    viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                  {visibleConnections.map(([startId, endId]) => {
                    const start = landmarks.find((landmark) => landmark.id === startId)
                    const end = landmarks.find((landmark) => landmark.id === endId)

                    if (!start || !end || start.visibility < 0.12 || end.visibility < 0.12) {
                      return null
                    }

                    return (
                        <line
                            key={`${startId}-${endId}`}
                            x1={toImageX(start.x, imageSize.width)}
                            y1={toImageY(start.y, imageSize.height)}
                            x2={toImageX(end.x, imageSize.width)}
                            y2={toImageY(end.y, imageSize.height)}
                            className="photo-editor-line"
                            style={{ strokeWidth: lineWidth }}
                        />
                    )
                  })}
                  {visibleLandmarks.map((landmark) => {
                    const isSelected = selectedLandmarkId === landmark.id
                    return (
                        <g key={landmark.id}>
                          <circle
                              cx={toImageX(landmark.x, imageSize.width)}
                              cy={toImageY(landmark.y, imageSize.height)}
                              r={isSelected ? selectedPointRadius : pointRadius}
                              className={`photo-editor-point ${isSelected ? 'selected' : ''}`}
                              style={{ strokeWidth: pointStrokeWidth }}
                              onPointerDown={(event) => {
                                event.preventDefault()
                                dragStateRef.current = { landmarkId: landmark.id, panel }
                                onSelect(landmark.id)
                              }}
                              onClick={() => onSelect(landmark.id)}
                          />
                          <text
                              x={toImageX(landmark.x, imageSize.width) + labelOffset}
                              y={toImageY(landmark.y, imageSize.height) - labelOffset}
                              className="photo-editor-label"
                              style={{ fontSize: labelFontSize }}
                          >
                            {LANDMARK_LABELS[landmark.id] || landmark.name}
                          </text>
                        </g>
                    )
                  })}
                </svg>
                <div className={"photo-editor-overlay-back"}></div>
                <img
                    src={imageUrl}
                    alt={title}
                    className="photo-editor-image"
                    onLoad={(event) => {
                      const image = event.currentTarget
                      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                        setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
                        setFrameSize({ width: image.clientWidth, height: image.clientHeight })
                        onImageSizeChange?.({ width: image.naturalWidth, height: image.naturalHeight })
                      }
                    }}
                />
              </div>
          ) : (
              <div className="photo-editor-empty">이미지를 업로드하면 랜드마크 편집 화면이 표시됩니다.</div>
          )}
        </div>
      </section>
  )
}

