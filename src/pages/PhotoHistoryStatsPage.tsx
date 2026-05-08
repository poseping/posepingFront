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
  craniovertebralAngle: number | null
  spineAlignment: number | null
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
      const craniovertebralAngle = getNumericMetric(
        item.side?.craniovertebral_angle ?? item.craniovertebral_angle ?? item.side?.neck_forward_angle ?? item.neck_forward_angle
      )
      const spineAlignment = getNumericMetric(item.front?.spine_alignment ?? item.spine_alignment)

      if (craniovertebralAngle === null && spineAlignment === null) {
        return null
      }

      return {
        label: date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : `${index + 1}`,
        sortTime: date && !Number.isNaN(date.getTime()) ? date.getTime() : index,
        historyKey: getHistoryKey(item, index),
        craniovertebralAngle,
        spineAlignment,
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
              <span>CVA 추정값</span>
              <strong>{formatMetric(latest?.craniovertebralAngle ?? null, '°')}</strong>
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
                  dataKey="craniovertebralAngle"
                  name="CVA 추정값"
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
