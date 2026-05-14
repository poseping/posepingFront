import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar, faTrash } from '@fortawesome/free-solid-svg-icons'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { deleteWebcamSession, getWebcamHistory, type WebcamSessionHistoryItem } from '../../services/webcamApi'

const CAUSE_META: Record<string, { label: string; color: string }> = {
  NECK_FORWARD:   { label: '거북목',        color: '#f97316' },
  HEAD_TILT:      { label: '머리 기울어짐',  color: '#a855f7' },
  SHOULDER_SLOPE: { label: '어깨 기울기',    color: '#ef4444' },
  HIP_DEVIATION:  { label: '골반 틀어짐',    color: '#eab308' },
  BAD_POSTURE:    { label: '나쁜 자세',      color: '#6b7280' },
}

interface ChartEntry {
  label: string
  startedAt: string
  endedAt: string | null
  good: number
  warning: number
  bad: number
  [key: string]: unknown
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
      ...(s.cause_counts ?? {}),
    }
  })
}

function getActiveCauses(sessions: WebcamSessionHistoryItem[]): string[] {
  const keys = new Set<string>()
  sessions.forEach(s => {
    if (s.cause_counts) Object.keys(s.cause_counts).forEach(k => keys.add(k))
  })
  return Object.keys(CAUSE_META).filter(k => keys.has(k))
}

export default function WebcamHistoryStats() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['webcam-history'],
    queryFn: () => getWebcamHistory(10),
  })

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteWebcamSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webcam-history'] }),
  })

  const handleDelete = (sessionId: number, label: string) => {
    if (!window.confirm(`"${label}" 세션 기록을 삭제할까요?`)) return
    doDelete(sessionId)
  }

  const sessions = data?.sessions ?? []
  const chartData = useMemo(() => buildChartData(sessions), [sessions])
  const activeCauses = useMemo(() => getActiveCauses(sessions), [sessions])
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
        <>
          <p className="wcam-history-chart-label">자세 분포</p>
          <div className="wcam-history-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.22)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontFamily: 'inherit' }} />
                <Tooltip content={<SessionTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'inherit', fontSize: '0.82rem' }} />
                <Bar dataKey="good" name="좋음" stackId="a" fill="#10b981" />
                <Bar dataKey="warning" name="경고" stackId="a" fill="#f59e0b" />
                <Bar dataKey="bad" name="나쁨" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {activeCauses.length > 0 && (
            <>
              <p className="wcam-history-chart-label">원인 분석</p>
              <div className="wcam-history-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.22)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                    <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontFamily: 'inherit' }} />
                    <Tooltip content={<SessionTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: 'inherit', fontSize: '0.82rem' }} />
                    {activeCauses.map(key => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={CAUSE_META[key]?.label ?? key}
                        fill={CAUSE_META[key]?.color ?? '#94a3b8'}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
      {!isLoading && !isError && sessions.length > 0 && (
        <div className="wcam-history-session-list">
          <p className="wcam-history-chart-label">세션 목록</p>
          {sessions.map(s => {
            const date = new Date(s.started_at)
            const label = `${date.getMonth() + 1}/${date.getDate()} #${s.session_id}`
            return (
              <div key={s.session_id} className="wcam-history-session-row">
                <span className="wcam-history-session-label">{label}</span>
                <span className="wcam-history-session-score">
                  {Math.round(s.good_ratio * 100)}%
                </span>
                <button
                  className="btn-icon wcam-history-session-delete"
                  onClick={() => handleDelete(s.session_id, label)}
                  disabled={isDeleting}
                  title="세션 삭제"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
