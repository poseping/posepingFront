import '../../styles/components/webcam-history-stats.scss'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { getWebcamHistory, type WebcamSessionHistoryItem } from '../../services/webcamApi'

interface ChartEntry {
  label: string
  startedAt: string
  endedAt: string | null
  good: number
  warning: number
  bad: number
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function calcDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return ''
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 1) return '1분 미만'
  return `약 ${mins}분`
}

function SessionTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const entry = payload[0]?.payload as ChartEntry

  return (
    <div className="wcam-history-tooltip">
      <p className="wcam-history-tooltip-title">{label}</p>
      <p className="wcam-history-tooltip-time">
        {fmtTime(entry.startedAt)}
        {entry.endedAt && ` ~ ${fmtTime(entry.endedAt)}`}
        {entry.endedAt && (
          <span className="wcam-history-tooltip-duration">
            {' '}({calcDuration(entry.startedAt, entry.endedAt)})
          </span>
        )}
      </p>
      <div className="wcam-history-tooltip-rows">
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.fill }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    </div>
  )
}

function buildChartData(sessions: WebcamSessionHistoryItem[]): ChartEntry[] {
  return [...sessions].reverse().map(s => {
    const date = new Date(s.started_at)
    const label = `${date.getMonth() + 1}/${date.getDate()} #${s.session_id}`
    return {
      label,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      good: s.good_frames,
      warning: s.warning_frames,
      bad: s.bad_frames,
    }
  })
}

export default function WebcamHistoryStats() {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['webcam-history'],
    queryFn: () => getWebcamHistory(5),
  })

  const sessions = data?.sessions ?? []
  const chartData = useMemo(() => buildChartData(sessions), [sessions])
  const latest = sessions[0]

  return (
    <section className="card wcam-history-stats">
      <div className="wcam-history-header">
        <div>
          <p className="wcam-history-kicker">Session History</p>
          <h3>웹캠 분석 기록</h3>
        </div>
        {latest && (
          <div className="wcam-history-metrics">
            <div>
              <span>최근 자세 점수</span>
              <strong>{Math.round(latest.good_ratio * 100)}%</strong>
            </div>
            <div>
              <span>누적 세션</span>
              <strong>{data?.total ?? 0}회</strong>
            </div>
          </div>
        )}
      </div>

      {isLoading && <div className="wcam-history-empty">기록을 불러오는 중입니다.</div>}
      {isError && <div className="wcam-history-empty">웹캠 분석 기록을 불러오지 못했습니다.</div>}
      {!isLoading && !isError && chartData.length === 0 && (
        <div className="wcam-history-empty">
          <FontAwesomeIcon icon={faChartBar} />
          <span>저장된 웹캠 분석 기록이 없습니다.</span>
        </div>
      )}

      {!isLoading && !isError && chartData.length > 0 && (
        <div className="wcam-history-chart">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.22)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontFamily: 'inherit' }} />
              <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontFamily: 'inherit' }} />
              <Tooltip content={<SessionTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'inherit', fontSize: '0.82rem' }} />
              <Bar dataKey="good" name="좋음" stackId="a" fill="#10b981" />
              <Bar dataKey="warning" name="주의" stackId="a" fill="#f59e0b" />
              <Bar dataKey="bad" name="나쁨" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="wcam-history-footer">
        <button className="btn--tonal" type="button" onClick={() => navigate('/webcam/stats')}>
          자세히 보기 <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </section>
  )
}
