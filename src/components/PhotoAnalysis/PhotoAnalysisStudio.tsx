import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  ManualLandmarkInput,
  PhotoAnalysisResponse,
  PhotoSideView,
  analyzeManualPhotoLandmarks,
  analyzePhotoFiles,
  savePhotoAnalysis,
} from '../../services/photoAnalysisApi'
import { buildPhotoCommentPayload, getAssistantErrorMessage, getPhotoComment } from '../../services/assistantApi'
import HistorySummaryCards from '../History/HistorySummaryCards'
import '../../styles/photo-analysis.scss'

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
}

const FRONT_EDIT_IDS = [0, 11, 12, 23, 24]
const LEFT_SIDE_EDIT_IDS = [7, 11, 23]
const RIGHT_SIDE_EDIT_IDS = [8, 12, 24]
const FRONT_CONNECTIONS = [
  [0, 11], [0, 12], [11, 12], [11, 23], [12, 24], [23, 24],
]
const SIDE_CONNECTIONS = [
  [0, 11], [11, 23], [0, 23], [0, 12], [12, 24], [0, 24],
]
const LANDMARK_LABELS: Record<number, string> = {
  0: '머리',
  7: '머리',
  8: '머리',
  11: '왼쪽 어깨',
  12: '오른쪽 어깨',
  23: '왼쪽 골반',
  24: '오른쪽 골반',
}

const PHOTO_NORMAL_RANGES = {
  neckForwardAngle: '정상 15° 이하',
  shoulderSlope: '정상 10° 이하',
  hipSlope: '정상 7° 이하',
  asymmetryScore: '정상 5% 이하',
}

function normalizeManualLandmarks(landmarks: ManualLandmarkInput[]) {
  return landmarks.map((landmark) => ({
    id: landmark.id,
    name: landmark.name,
    x: Number(landmark.x.toFixed(6)),
    y: Number(landmark.y.toFixed(6)),
    z: Number(landmark.z.toFixed(6)),
    visibility: Number(landmark.visibility.toFixed(6)),
  }))
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  const axiosError = error as AxiosError<{ detail?: unknown }>
  const detail = axiosError.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
        .map((item) => {
          if (typeof item === 'string') {
            return item
          }

          if (item && typeof item === 'object') {
            const maybeError = item as { loc?: unknown[]; msg?: string }
            const loc = Array.isArray(maybeError.loc) ? maybeError.loc.join(' > ') : null
            if (maybeError.msg && loc) {
              return `${loc}: ${maybeError.msg}`
            }
            if (maybeError.msg) {
              return maybeError.msg
            }
          }

          return null
        })
        .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join('\n')
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
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

function formatMetric(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(1)}${suffix}`
}

function EditableLandmarkCanvas({
                                  title,
                                  imageUrl,
                                  landmarks,
                                  panel,
                                  sideView,
                                  selectedLandmarkId,
                                  onSelect,
                                  onChange,
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

  const selectedLandmark = landmarks.find((landmark) => landmark.id === selectedLandmarkId) ?? null
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
          {selectedLandmark && (
              <p>
                선택된 포인트: <strong>{LANDMARK_LABELS[selectedLandmark.id] || selectedLandmark.name || `landmark_${selectedLandmark.id}`}</strong>
              </p>
          )}
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
                      }
                    }}
                />
              </div>
          ) : (
              <div className="photo-editor-empty">이미지를 업로드하면 랜드마크 편집 화면이 표시됩니다.</div>
          )}
        </div>
        <p className="photo-editor-help">
          {panel === 'front'
              ? '정면 사진에서는 머리, 양쪽 어깨, 양쪽 골반만 수정합니다.'
              : '측면 사진에서는 머리, 어깨, 골반만 수정합니다.'}
          {' '}나머지 랜드마크는 초기 감지값을 그대로 유지한 채 최종 분석에 사용됩니다.
        </p>
      </section>
  )
}

function buildObjectUrl(file: File | null) {
  return file ? URL.createObjectURL(file) : null
}

function ResultSummary({
                         title,
                         result,
                         assistantComment,
                         assistantCommentError,
                         isAssistantCommentPending,
                       }: {
  title: string
  result: PhotoAnalysisResponse
  assistantComment: string | null
  assistantCommentError: string | null
  isAssistantCommentPending: boolean
}) {
  return (
      <section className="card">
        <div className="photo-summary-header">
          <h3>{title}</h3>
          <span className={`photo-status-chip ${result.status}`}>{result.status}</span>
        </div>
        <div className="photo-summary-grid">
          <div>
            <span>분석 모드</span>
            <strong>{result.analysis_mode == 'full'?'전신':'반신'}</strong>
          </div>
          <div>
            <span>전체 신뢰도</span>
            <strong>{Math.round(result.confidence * 100)}%</strong>
          </div>
          <div>
            <span>목 각도</span>
            <strong>{formatMetric(result.side.neck_forward_angle, '°')}</strong>
            <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.neckForwardAngle}</small>
          </div>
          <div>
            <span>어깨 기울기</span>
            <strong>{formatMetric(result.front.shoulder_slope, '°')}</strong>
            <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.shoulderSlope}</small>
          </div>
          <div>
            <span>골반 기울기</span>
            <strong>{formatMetric(result.front.hip_slope, '°')}</strong>
            <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.hipSlope}</small>
          </div>
          <div>
            <span>좌우 비대칭</span>
            <strong>{formatMetric(result.front.asymmetry_score, '%')}</strong>
            <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.asymmetryScore}</small>
          </div>
        </div>
        {result.alerts.length > 0 && (
            <div className="photo-message-block">
              <h4>알림</h4>
              <ul>
                {result.alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
        )}
        {result.issues.length > 0 && (
            <div className="photo-message-block issues">
              <h4>감지된 항목</h4>
              <ul>
                {result.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
        )}
        {result.missing_landmarks.length > 0 && (
            <div className="photo-message-block">
              <h4>보완이 필요한 랜드마크</h4>
              <ul>
                {result.missing_landmarks.map((landmark) => (
                    <li key={landmark}>{landmark}</li>
                ))}
              </ul>
            </div>
        )}
        <div className="photo-message-block photo-message-block--assistant">
          <h4>AI 코멘트</h4>
          {isAssistantCommentPending && !assistantComment ? (
              <p className="photo-message-muted">코멘트를 작성하는 중입니다...</p>
          ) : assistantCommentError ? (
              <p className="photo-message-error">{assistantCommentError}</p>
          ) : assistantComment ? (
              <p>{assistantComment}</p>
          ) : (
              <p className="photo-message-muted">최종 분석이 완료되면 맞춤 코멘트를 보여드릴게요.</p>
          )}
        </div>
      </section>
  )
}

export default function PhotoAnalysisStudio() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(1)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [sideFile, setSideFile] = useState<File | null>(null)
  const [sideView, setSideView] = useState<PhotoSideView>('left')
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null)
  const [sidePreviewUrl, setSidePreviewUrl] = useState<string | null>(null)
  const [finalResult, setFinalResult] = useState<PhotoAnalysisResponse | null>(null)
  const [frontLandmarks, setFrontLandmarks] = useState<ManualLandmarkInput[]>([])
  const [sideLandmarks, setSideLandmarks] = useState<ManualLandmarkInput[]>([])
  const [selectedFrontLandmarkId, setSelectedFrontLandmarkId] = useState<number | null>(null)
  const [selectedSideLandmarkId, setSelectedSideLandmarkId] = useState<number | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [assistantComment, setAssistantComment] = useState<string | null>(null)
  const [assistantCommentError, setAssistantCommentError] = useState<string | null>(null)

  useEffect(() => {
    const nextFrontUrl = buildObjectUrl(frontFile)
    setFrontPreviewUrl(nextFrontUrl)
    return () => {
      if (nextFrontUrl) {
        URL.revokeObjectURL(nextFrontUrl)
      }
    }
  }, [frontFile])

  useEffect(() => {
    const nextSideUrl = buildObjectUrl(sideFile)
    setSidePreviewUrl(nextSideUrl)
    return () => {
      if (nextSideUrl) {
        URL.revokeObjectURL(nextSideUrl)
      }
    }
  }, [sideFile])

  const analyzePhotosMutation = useMutation({
    mutationFn: async () => {
      if (!frontFile || !sideFile) {
        throw new Error('정면 사진과 측면 사진을 모두 선택해 주세요.')
      }

      return analyzePhotoFiles(frontFile, sideFile, sideView)
    },
    onSuccess: (data) => {
      setFinalResult(null)
      setSavedMessage(null)
      setFrontLandmarks(data.front_landmarks)
      setSideLandmarks(data.side_landmarks)
      setSelectedFrontLandmarkId(data.front_landmarks.find((landmark) => FRONT_EDIT_IDS.includes(landmark.id))?.id ?? null)
      setSelectedSideLandmarkId(
          data.side_landmarks.find((landmark) =>
              (sideView === 'left' ? LEFT_SIDE_EDIT_IDS : RIGHT_SIDE_EDIT_IDS).includes(landmark.id)
          )?.id ?? null
      )
      setActiveStep(3)
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail?: string }>
      const detail =
          axiosError.response?.data?.detail ||
          (error instanceof Error ? error.message : '사진 분석 요청에 실패했습니다.')
      window.alert(detail)
    },
  })

  const finalAnalyzeMutation = useMutation({
    mutationFn: () =>
        analyzeManualPhotoLandmarks(
            sideView,
            normalizeManualLandmarks(frontLandmarks),
            normalizeManualLandmarks(sideLandmarks)
        ),
    onSuccess: (data) => {
      setFinalResult(data)
      setSavedMessage(null)
      setAssistantComment(null)
      setAssistantCommentError(null)
      setActiveStep(4)
    },
    onError: (error) => {
      console.error('최종 분석 실패:', error)
      window.alert(extractApiErrorMessage(error, '최종 분석 요청에 실패했습니다.'))
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!finalResult?.save_token) {
        throw new Error('저장 가능한 분석 결과가 없습니다.')
      }

      return savePhotoAnalysis(finalResult.save_token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-analysis-history'] })
      setSavedMessage(`오늘의 자세를 기록했습니다!`)
      navigate('/history')
    },
    onError: (error) => {
      console.error('분석 저장 실패:', error)
      window.alert(extractApiErrorMessage(error, '분석 결과 저장에 실패했습니다.'))
    },
  })

  const photoCommentMutation = useMutation({
    mutationFn: getPhotoComment,
    onSuccess: (data) => {
      setAssistantComment(data.comment)
      setAssistantCommentError(null)
    },
    onError: (error) => {
      setAssistantCommentError(getAssistantErrorMessage(error, '사진 코멘트를 불러오지 못했어요.'))
    },
  })

  useEffect(() => {
    if (!finalResult) return

    photoCommentMutation.mutate(buildPhotoCommentPayload(finalResult))
  }, [finalResult])

  const handleFileChange =
      (kind: 'front' | 'side') => (event: ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null
        if (kind === 'front') {
          setFrontFile(nextFile)
        } else {
          setSideFile(nextFile)
        }

        setFinalResult(null)
        setSavedMessage(null)
        setAssistantComment(null)
        setAssistantCommentError(null)
        setFrontLandmarks([])
        setSideLandmarks([])
        setActiveStep(2)
      }

  return (
      <>
        {activeStep === 1 && (
            <section className="photo-hero-card">
              <div>
                <p className="photo-kicker">Photo Analysis</p>
                <h2>업로드한 사진으로 자세를 세밀하게 보정해 분석합니다</h2>
                <p>
                  정면 사진과 측면 사진을 올리면 랜드마크를 먼저 잡아주고, 사용자가 직접 위치를 끌어 수정한 뒤
                  최종 분석과 DB 저장 여부를 결정할 수 있습니다.
                </p>
              </div>
              <div className="photo-action-row">
                <button className="btn--primary btn--lg" onClick={() => setActiveStep(2)}>
                  내 자세 확인하기
                </button>
              </div>
            </section>
        )}

        <div className="photo-analysis-page">
          {activeStep === 1 && (
              <HistorySummaryCards />
          )}

          {activeStep === 2 && (
              <>
                <section className="card">
                  <div className="photo-upload-grid">
                    <label className="photo-upload-field">
                      <span>정면 사진</span>
                      <input type="file" accept="image/*" onChange={handleFileChange('front')} />
                      <small>{frontFile ? frontFile.name : '머리부터 골반까지 보이는 사진을 권장합니다.'}</small>
                    </label>
                    <label className="photo-upload-field">
                      <span>측면 사진</span>
                      <input type="file" accept="image/*" onChange={handleFileChange('side')} />
                      <small>{sideFile ? sideFile.name : '왼쪽 또는 오른쪽 측면 사진을 선택하세요.'}</small>
                    </label>
                    <label className="photo-upload-field compact">
                      <span>측면 방향</span>
                      <select value={sideView} onChange={(event) => setSideView(event.target.value as PhotoSideView)}>
                        <option value="left">왼쪽 측면</option>
                        <option value="right">오른쪽 측면</option>
                      </select>
                    </label>
                  </div>
                </section>
                <div className="photo-action-row">
                  <button className="btn--secondary btn--lg" onClick={() => setActiveStep(1)}>
                    이전
                  </button>
                  <button
                      className="btn--primary btn--lg"
                      onClick={() => analyzePhotosMutation.mutate()}
                      disabled={!frontFile || !sideFile || analyzePhotosMutation.isPending}
                  >
                    {analyzePhotosMutation.isPending ? '랜드마크 감지 중...' : '1. 랜드마크 감지'}
                  </button>
                </div>
              </>
          )}

          {activeStep === 3 && (
              <>
                <section className="photo-editor-grid">
                  <EditableLandmarkCanvas
                      title="정면 사진"
                      imageUrl={frontPreviewUrl}
                      landmarks={frontLandmarks}
                      panel="front"
                      sideView={sideView}
                      selectedLandmarkId={selectedFrontLandmarkId}
                      onSelect={setSelectedFrontLandmarkId}
                      onChange={setFrontLandmarks}
                  />
                  <EditableLandmarkCanvas
                      title="측면 사진"
                      imageUrl={sidePreviewUrl}
                      landmarks={sideLandmarks}
                      panel="side"
                      sideView={sideView}
                      selectedLandmarkId={selectedSideLandmarkId}
                      onSelect={setSelectedSideLandmarkId}
                      onChange={setSideLandmarks}
                  />
                </section>
                <section className="photo-action-row">
                  <button className="btn--secondary btn--lg" onClick={() => setActiveStep(2)}>
                    이전
                  </button>
                  <button
                      className="btn--primary btn--lg"
                      onClick={() => finalAnalyzeMutation.mutate()}
                      disabled={frontLandmarks.length === 0 || sideLandmarks.length === 0 || finalAnalyzeMutation.isPending}
                  >
                    {finalAnalyzeMutation.isPending ? '최종 분석 중...' : '다음'}
                  </button>
                </section>
              </>
          )}

          {activeStep === 4 && finalResult && (
              <>
                <ResultSummary
                    title="최종 분석 결과"
                    result={finalResult}
                    assistantComment={assistantComment}
                    assistantCommentError={assistantCommentError}
                    isAssistantCommentPending={photoCommentMutation.isPending}
                />
                <div className="photo-save-actions">
                  {savedMessage && <p className="photo-save-message">{savedMessage}</p>}
                  <button
                      className="btn--secondary btn--lg"
                      onClick={() => {
                        setFinalResult(null)
                        setSavedMessage(null)
                        setActiveStep(1)
                      }}
                  >
                    돌아가기
                  </button>
                  <button
                      className="btn--primary btn--lg"
                      onClick={() => saveMutation.mutate()}
                      disabled={!finalResult.can_save || !finalResult.save_token || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? '기록 중...' : '기록하기'}
                  </button>
                </div>
              </>
          )}
        </div>
      </>
  )
}
