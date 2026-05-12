import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import SelectableTrendDot from '../components/PhotoAnalysis/SelectableTrendDot'
import PhotoHistoryRecordSummary from '../components/PhotoAnalysis/PhotoHistoryRecordSummary'
import '../styles/features/photo-analysis.scss'
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
  deletePhotoAnalysis,
  getPhotoAnalysisHistory,
  type PhotoAnalysisHistoryItem,
} from '../services/photoAnalysisApi'

interface HistoryTrendPoint {
  label: string
  sortTime: number
  historyKey: string
  postureScore: number | null
  craniovertebralAngle: number | null
  asymmetryScore: number | null
  item: PhotoAnalysisHistoryItem
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

function getHistoryRecordId(item: PhotoAnalysisHistoryItem) {
  return item.analysis_id ?? item.id ?? null
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
      const postureScore = getNumericMetric(item.posture_score)
      const craniovertebralAngle = getNumericMetric(item.side?.craniovertebral_angle ?? item.craniovertebral_angle)
      const asymmetryScore = getNumericMetric(item.front?.asymmetry_score ?? item.asymmetry_score)

      if (postureScore === null && craniovertebralAngle === null && asymmetryScore === null) {
        return null
      }

      return {
        label: date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : `${index + 1}`,
        sortTime: date && !Number.isNaN(date.getTime()) ? date.getTime() : index,
        historyKey: getHistoryKey(item, index),
        postureScore,
        craniovertebralAngle,
        asymmetryScore,
        item,
      }
    })
    .filter((item): item is HistoryTrendPoint => item !== null)
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(-10)
}


export default function PhotoHistoryStatsPage() {
  const queryClient = useQueryClient()
  const [selectedHistoryKey, setSelectedHistoryKey] = useState<string | null>(null)
  const [confirmingDeleteHistoryKey, setConfirmingDeleteHistoryKey] = useState<string | null>(null)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['photo-analysis-history'],
    queryFn: getPhotoAnalysisHistory,
  })
  const deleteMutation = useMutation({
    mutationFn: (item: PhotoAnalysisHistoryItem) => {
      const recordId = getHistoryRecordId(item)
      if (recordId === null) {
        throw new Error('삭제할 기록 ID가 없습니다.')
      }

      return deletePhotoAnalysis(recordId)
    },
    onSuccess: (_data, deletedItem) => {
      const deletedRecordId = getHistoryRecordId(deletedItem)

      queryClient.setQueryData<PhotoAnalysisHistoryItem[]>(['photo-analysis-history'], (previous) =>
        previous?.filter((item) => getHistoryRecordId(item) !== deletedRecordId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['photo-analysis-history'] })
      queryClient.invalidateQueries({ queryKey: ['photo-analysis-history-summary'] })
      setConfirmingDeleteHistoryKey(null)
      setSelectedHistoryKey(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : '기록 삭제에 실패했습니다.')
    },
  })

  const trendData = useMemo(() => buildHistoryTrendData(data), [data])
  const latest = trendData[trendData.length - 1]
  const selectedTrendPoint = trendData.find((item) => item.historyKey === selectedHistoryKey) ?? latest

  return (
    <>
      <PageHeader />
      <main className="photo-analysis-page">
      <section className="card" id="photo-history-stats">
        <div className="photo-stats-header">
          <div>
            <p className="photo-kicker">Saved History</p>
            <h3>저장된 기록 통계</h3>
          </div>
          <div className="photo-stats-metrics">
            <div>
              <span>신체 점수</span>
              <strong>{formatMetric(latest?.postureScore ?? null, '점')}</strong>
            </div>
            <div>
              <span>CVA 추정값</span>
              <strong>{formatMetric(latest?.craniovertebralAngle ?? null, '°')}</strong>
            </div>
            <div>
              <span>좌우 비대칭</span>
              <strong>{formatMetric(latest?.asymmetryScore ?? null, '%')}</strong>
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
                <YAxis tickLine={false} axisLine={false} width={36} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="postureScore"
                  name="신체 점수"
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
                  dataKey="craniovertebralAngle"
                  name="CVA 추정값"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="asymmetryScore"
                  name="좌우 비대칭"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {!isLoading && !isError && selectedTrendPoint && (
        <PhotoHistoryRecordSummary
          item={selectedTrendPoint.item}
          isDeleting={deleteMutation.isPending}
          isConfirmingDelete={confirmingDeleteHistoryKey === selectedTrendPoint.historyKey}
          onRequestDelete={() => setConfirmingDeleteHistoryKey(selectedTrendPoint.historyKey)}
          onCancelDelete={() => setConfirmingDeleteHistoryKey(null)}
          onDelete={(item) => deleteMutation.mutate(item)}
        />
      )}
      </main>
    </>
  )
}
