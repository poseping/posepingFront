import { type KeyboardEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getPhotoAnalysisHistory, type PhotoAnalysisHistoryItem } from '../../services/photoAnalysisApi'

const PHOTO_NORMAL_RANGES = {
  neckForwardAngle: '정상 15° 이하',
  shoulderSlope: '정상 10° 이하',
  hipSlope: '정상 7° 이하',
  asymmetryScore: '정상 5% 이하',
}

interface HistoryTrendPoint {
  label: string
  sortTime: number
  historyKey: string
  neckForwardAngle: number | null
  spineAlignment: number | null
  item: PhotoAnalysisHistoryItem
}

interface TrendDotProps {
  cx?: number
  cy?: number
  stroke?: string
  payload?: HistoryTrendPoint
  selectedHistoryKey: string | null
  onSelect: (historyKey: string) => void
}

interface ChartClickState {
  activePayload?: Array<{
    payload?: HistoryTrendPoint
  }>
}

function getNumericMetric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatMetric(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(1)}${suffix}`
}

function getHistoryDate(item: PhotoAnalysisHistoryItem) {
  return item.saved_at ?? item.analyzed_at ?? item.created_at ?? ''
}

function getHistoryKey(item: PhotoAnalysisHistoryItem, index: number) {
  return String(item.analysis_id ?? item.id ?? `${getHistoryDate(item)}-${index}`)
}

function formatHistoryDate(item: PhotoAnalysisHistoryItem) {
  const dateValue = getHistoryDate(item)
  const date = dateValue ? new Date(dateValue) : null

  if (!date || Number.isNaN(date.getTime())) {
    return '날짜 정보 없음'
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAnalysisMode(mode: PhotoAnalysisHistoryItem['analysis_mode']) {
  if (mode === 'full') {
    return '전신'
  }

  if (mode === 'upper_body_only') {
    return '반신'
  }

  if (mode === 'manual_adjustment_required') {
    return '수동 보정'
  }

  return '-'
}

function getMetric(
  item: PhotoAnalysisHistoryItem,
  metricKey: keyof NonNullable<PhotoAnalysisHistoryItem['front']>,
  fallbackKey: keyof PhotoAnalysisHistoryItem
) {
  return getNumericMetric(item.front?.[metricKey] ?? item[fallbackKey])
}

function SelectableTrendDot({ cx, cy, stroke, payload, selectedHistoryKey, onSelect }: TrendDotProps) {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
    return null
  }

  const isSelected = payload.historyKey === selectedHistoryKey
  const handleSelect = () => onSelect(payload.historyKey)
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect()
    }
  }

  return (
    <g
      className="photo-history-chart-dot"
      style={{ color: stroke ?? '#155eef' }}
      tabIndex={0}
      role="button"
      aria-label={`${payload.label} 기록 보기`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle
        className="photo-history-chart-dot__mark"
        cx={cx}
        cy={cy}
        r={isSelected ? 5 : 3.5}
        fill={isSelected ? stroke ?? '#155eef' : '#ffffff'}
        stroke={stroke ?? '#155eef'}
        strokeWidth={2}
      />
    </g>
  )
}

function getClickedTrendPoint(state: unknown) {
  const chartState = state as ChartClickState | null
  return chartState?.activePayload?.[0]?.payload ?? null
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
        historyKey: getHistoryKey(item, index),
        neckForwardAngle,
        spineAlignment,
        item,
      }
    })
    .filter((item): item is HistoryTrendPoint => item !== null)
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(-10)
}

function HistoryRecordSummary({ item }: { item: PhotoAnalysisHistoryItem }) {
  const confidence = getNumericMetric(item.confidence)
  const neckForwardAngle = getNumericMetric(item.side?.neck_forward_angle ?? item.neck_forward_angle)
  const shoulderSlope = getMetric(item, 'shoulder_slope', 'shoulder_slope')
  const hipSlope = getMetric(item, 'hip_slope', 'hip_slope')
  const asymmetryScore = getMetric(item, 'asymmetry_score', 'asymmetry_score')
  const alerts = item.alerts ?? []
  const issues = item.issues ?? []
  const missingLandmarks = item.missing_landmarks ?? []
  const aiMessage = item.ai_message?.trim()

  return (
    <section className="card photo-history-selected-record">
      <div className="photo-summary-header">
        <div>
          <p className="photo-kicker">Selected Record</p>
          <h3>{formatHistoryDate(item)} 기록</h3>
        </div>
        {item.status && <span className={`photo-status-chip ${item.status}`}>{item.status}</span>}
      </div>
      <div className="photo-summary-grid">
        <div>
          <span>분석 모드</span>
          <strong>{formatAnalysisMode(item.analysis_mode)}</strong>
        </div>
        <div>
          <span>전체 신뢰도</span>
          <strong>{confidence === null ? '-' : `${Math.round(confidence * 100)}%`}</strong>
        </div>
        <div>
          <span>목 각도</span>
          <strong>{formatMetric(neckForwardAngle, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.neckForwardAngle}</small>
        </div>
        <div>
          <span>어깨 기울기</span>
          <strong>{formatMetric(shoulderSlope, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.shoulderSlope}</small>
        </div>
        <div>
          <span>골반 기울기</span>
          <strong>{formatMetric(hipSlope, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.hipSlope}</small>
        </div>
        <div>
          <span>좌우 비대칭</span>
          <strong>{formatMetric(asymmetryScore, '%')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.asymmetryScore}</small>
        </div>
      </div>
      {alerts.length > 0 && (
        <div className="photo-message-block">
          <h4>알림</h4>
          <ul>
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}
      {issues.length > 0 && (
        <div className="photo-message-block issues">
          <h4>감지된 항목</h4>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      {missingLandmarks.length > 0 && (
        <div className="photo-message-block">
          <h4>보완이 필요한 랜드마크</h4>
          <ul>
            {missingLandmarks.map((landmark) => (
              <li key={landmark}>{landmark}</li>
            ))}
          </ul>
        </div>
      )}
      {aiMessage && (
        <div className="photo-message-block photo-message-block--assistant">
          <h4>AI 코멘트</h4>
          <p>{aiMessage}</p>
        </div>
      )}
    </section>
  )
}

export default function PhotoHistoryStats() {
  const [selectedHistoryKey, setSelectedHistoryKey] = useState<string | null>(null)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['photo-analysis-history'],
    queryFn: getPhotoAnalysisHistory,
  })

  const trendData = useMemo(() => buildHistoryTrendData(data), [data])
  const latest = trendData[trendData.length - 1]
  const selectedTrendPoint = trendData.find((item) => item.historyKey === selectedHistoryKey) ?? latest

  return (
    <>
      <section className="card" id="photo-history-stats">
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
              <LineChart
                data={trendData}
                margin={{ top: 12, right: 18, bottom: 4, left: 0 }}
                onClick={(state) => {
                  const trendPoint = getClickedTrendPoint(state)
                  if (trendPoint) {
                    setSelectedHistoryKey(trendPoint.historyKey)
                  }
                }}
              >
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
                  dot={(props) => (
                    <SelectableTrendDot
                      {...props}
                      selectedHistoryKey={selectedHistoryKey}
                      onSelect={setSelectedHistoryKey}
                    />
                  )}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="spineAlignment"
                  name="척추정렬도"
                  stroke="#0b7a75"
                  strokeWidth={2.5}
                  dot={(props) => (
                    <SelectableTrendDot
                      {...props}
                      selectedHistoryKey={selectedHistoryKey}
                      onSelect={setSelectedHistoryKey}
                    />
                  )}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {!isLoading && !isError && selectedTrendPoint && <HistoryRecordSummary item={selectedTrendPoint.item} />}
    </>
  )
}
