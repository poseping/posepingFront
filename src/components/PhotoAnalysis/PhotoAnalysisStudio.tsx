import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  PhotoAnalysisHistoryItem,
  ManualLandmarkInput,
  PhotoAnalysisResponse,
  PhotoSideView,
  analyzeManualPhotoLandmarks,
  analyzePhotoFiles,
  getPhotoAnalysisHistory,
  savePhotoAnalysis,
} from '../../services/photoAnalysisApi'
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

function getNumericMetric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getHistoryDate(item: PhotoAnalysisHistoryItem) {
  return item.saved_at ?? item.analyzed_at ?? item.created_at ?? ''
}

function buildHistoryTrendData(items: PhotoAnalysisHistoryItem[]) {
  return items
      .map((item, index) => {
        const dateValue = getHistoryDate(item)
        const date = dateValue ? new Date(dateValue) : null
        const neckForwardAngle = getNumericMetric(item.side?.neck_forward_angle ?? item.neck_forward_angle)
        const spineAlignment = getNumericMetric(item.front?.spine_alignment ?? item.spine_alignment)

        if (neckForwardAngle === null && spineAlignment === null) {
          return null
        }

        return {
          label: date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : `${index + 1}`,
          sortTime: date && !Number.isNaN(date.getTime()) ? date.getTime() : index,
          neckForwardAngle,
          spineAlignment,
        }
      })
      .filter((item): item is {
        label: string
        sortTime: number
        neckForwardAngle: number | null
        spineAlignment: number | null
      } => item !== null)
      .sort((a, b) => a.sortTime - b.sortTime)
      .slice(-10)
}

function PhotoHistoryStats() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['photo-analysis-history'],
    queryFn: getPhotoAnalysisHistory,
  })

  const trendData = useMemo(() => buildHistoryTrendData(data), [data])
  const latest = trendData[trendData.length - 1]

  return (
      <section className="photo-stats-card">
        <div className="photo-stats-header">
          <div>
            <p className="photo-kicker">Saved History</p>
            <h3>저장된 기록 통계</h3>
          </div>
          <div className="photo-stats-metrics">
            <div>
              <span>거북목</span>
              <strong>{formatMetric(latest?.neckForwardAngle ?? null, '°')}</strong>
            </div>
            <div>
              <span>척추정렬도</span>
              <strong>{formatMetric(latest?.spineAlignment ?? null)}</strong>
            </div>
          </div>
        </div>

        {isLoading && <div className="photo-stats-empty">통계를 불러오는 중입니다.</div>}
        {isError && <div className="photo-stats-empty">저장된 기록 통계를 불러오지 못했습니다.</div>}
        {!isLoading && !isError && trendData.length === 0 && (
            <div className="photo-stats-empty">저장된 사진 분석 기록이 없습니다.</div>
        )}
        {!isLoading && !isError && trendData.length > 0 && (
            <div className="photo-stats-chart">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.22)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip />
                  <Legend />
                  <Line
                      type="monotone"
                      dataKey="neckForwardAngle"
                      name="거북목"
                      stroke="#155eef"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                  />
                  <Line
                      type="monotone"
                      dataKey="spineAlignment"
                      name="척추정렬도"
                      stroke="#0b7a75"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
        )}
      </section>
  )
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
      <section className="photo-editor-card">
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
                       }: {
  title: string
  result: PhotoAnalysisResponse
}) {
  return (
      <section className="photo-summary-card">
        <div className="photo-summary-header">
          <h3>{title}</h3>
          <span className={`photo-status-chip ${result.status}`}>{result.status}</span>
        </div>
        <div className="photo-summary-grid">
          <div>
            <span>분석 모드</span>
            <strong>{result.analysis_mode}</strong>
          </div>
          <div>
            <span>전체 신뢰도</span>
            <strong>{Math.round(result.confidence * 100)}%</strong>
          </div>
          <div>
            <span>목 각도</span>
            <strong>{formatMetric(result.side.neck_forward_angle, '°')}</strong>
          </div>
          <div>
            <span>어깨 기울기</span>
            <strong>{formatMetric(result.front.shoulder_slope, '°')}</strong>
          </div>
          <div>
            <span>골반 기울기</span>
            <strong>{formatMetric(result.front.hip_slope, '°')}</strong>
          </div>
          <div>
            <span>좌우 비대칭</span>
            <strong>{formatMetric(result.front.asymmetry_score, '%')}</strong>
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
      </section>
  )
}

export default function PhotoAnalysisStudio() {
  const queryClient = useQueryClient()
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['photo-analysis-history'] })
      setSavedMessage(`분석 결과를 저장했습니다. 분석 ID: ${data.analysis_id}`)
    },
    onError: (error) => {
      console.error('분석 저장 실패:', error)
      window.alert(extractApiErrorMessage(error, '분석 결과 저장에 실패했습니다.'))
    },
  })

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
        setFrontLandmarks([])
        setSideLandmarks([])
        setActiveStep(2)
      }

  return (
      <div className="photo-analysis-page">
        {activeStep === 1 && (
            <>
              <div>
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
                    <button className="photo-primary-button" onClick={() => setActiveStep(2)}>
                      내 자세 확인하기
                    </button>
                  </div>
                </section>
              </div>
              <PhotoHistoryStats />
            </>
        )}

        {activeStep === 2 && (
            <section className="photo-upload-card">
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
              <div className="photo-action-row">
                <button className="photo-secondary-button" onClick={() => setActiveStep(1)}>
                  이전
                </button>
                <button
                    className="photo-primary-button"
                    onClick={() => analyzePhotosMutation.mutate()}
                    disabled={!frontFile || !sideFile || analyzePhotosMutation.isPending}
                >
                  {analyzePhotosMutation.isPending ? '랜드마크 감지 중...' : '1. 랜드마크 감지'}
                </button>
              </div>
            </section>
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
              <section className="photo-action-panel">
                <button className="photo-secondary-button" onClick={() => setActiveStep(2)}>
                  이전
                </button>
                <button
                    className="photo-primary-button"
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
              <ResultSummary title="최종 분석 결과" result={finalResult} />
              <section className="photo-save-panel">
                <div>
                  <h3>3. 결과 저장 여부 선택</h3>
                  <p>최종 분석 결과를 확인한 뒤 DB에 저장할지 결정하세요.</p>
                  {savedMessage && <p className="photo-save-message">{savedMessage}</p>}
                </div>
                <div className="photo-save-actions">
                  <button
                      className="photo-primary-button"
                      onClick={() => saveMutation.mutate()}
                      disabled={!finalResult.can_save || !finalResult.save_token || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? '저장 중...' : '저장'}
                  </button>
                  <button
                      className="photo-secondary-button"
                      onClick={() => {
                        setFinalResult(null)
                        setSavedMessage(null)
                        setActiveStep(3)
                      }}
                  >
                    취소
                  </button>
                </div>
              </section>
            </>
        )}
      </div>
  )
}
