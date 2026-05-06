import { useMemo } from 'react'
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

export default function PhotoHistoryStats() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['photo-analysis-history'],
    queryFn: getPhotoAnalysisHistory,
  })

  const trendData = useMemo(() => buildHistoryTrendData(data), [data])
  const latest = trendData[trendData.length - 1]

  return (
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
