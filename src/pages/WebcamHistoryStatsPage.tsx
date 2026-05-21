import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar, faCalendar, faClock } from '@fortawesome/free-solid-svg-icons'
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import WcamSessionDetailCard from '../components/Webcam/WcamSessionDetailCard'
import WcamPeriodPicker from '../components/Webcam/WcamPeriodPicker'
import {
  deleteWebcamSession,
  getWebcamHistory,
  type WebcamHistoryResponse,
  type WebcamSessionHistoryItem,
} from '../services/webcamApi'
import '../styles/features/webcam.scss'
import '../styles/components/webcam-history-stats.scss'

const CAUSE_META: Record<string, { label: string; color: string }> = {
  NECK_FORWARD:   { label: '거북목',       color: '#f97316' },
  HEAD_TILT:      { label: '머리 기울어짐', color: '#a855f7' },
  SHOULDER_SLOPE: { label: '어깨 기울기',   color: '#ef4444' },
  BAD_POSTURE:    { label: '나쁜 자세',     color: '#6b7280' },
}

type PeriodUnit = 'day' | 'week' | 'month'
type TimeFilter = 'all' | 'morning' | 'afternoon'

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function endOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const dow = x.getDay()
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1)) // 월요일 시작
  return x
}
function getPeriodRange(unit: PeriodUnit, anchor: Date): { start: Date; end: Date } {
  if (unit === 'day') return { start: startOfDay(anchor), end: endOfDay(anchor) }
  if (unit === 'week') {
    const start = startOfWeek(anchor)
    const end = endOfDay(new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000))
    return { start, end }
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

interface ChartEntry {
  label: string
  sessionId: number
  startedAt: string
  endedAt: string | null
  good: number
  warning: number
  bad: number
  [key: string]: unknown
}

interface BarClickState {
  activePayload?: Array<{ payload?: ChartEntry }>
}

function buildChartData(sessions: WebcamSessionHistoryItem[]): ChartEntry[] {
  return [...sessions].reverse().map(s => {
    const date = new Date(s.started_at)
    const label = `${date.getMonth() + 1}/${date.getDate()} #${s.session_id}`
    return {
      label,
      sessionId: s.session_id,
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

function applyFilters(
  sessions: WebcamSessionHistoryItem[],
  periodUnit: PeriodUnit,
  periodAnchor: Date,
  timeFilter: TimeFilter,
): WebcamSessionHistoryItem[] {
  const { start, end } = getPeriodRange(periodUnit, periodAnchor)
  return sessions.filter(s => {
    const date = new Date(s.started_at)
    if (date < start || date > end) return false
    if (timeFilter === 'morning' && date.getHours() >= 12) return false
    if (timeFilter === 'afternoon' && date.getHours() < 12) return false
    return true
  })
}

const PERIOD_UNIT: PeriodUnit = 'week'

const TIME_FILTER_OPTIONS: Array<{ value: TimeFilter; label: string }> = [
  { value: 'all',       label: '전체' },
  { value: 'morning',   label: '오전' },
  { value: 'afternoon', label: '오후' },
]

export default function WebcamHistoryStatsPage() {
  const queryClient = useQueryClient()
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [periodAnchor, setPeriodAnchor] = useState<Date>(() => new Date())
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['webcam-history-full'],
    queryFn: () => getWebcamHistory(50),
  })

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteWebcamSession,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData<WebcamHistoryResponse>(
        ['webcam-history-full'],
        (prev) => prev
          ? { ...prev, sessions: prev.sessions.filter(s => s.session_id !== deletedId), total: prev.total - 1 }
          : prev,
      )
      queryClient.invalidateQueries({ queryKey: ['webcam-history'] })
      setConfirmingDeleteId(null)
      setSelectedSessionId(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  useEffect(() => { setSelectedSessionId(null) }, [periodAnchor, timeFilter])

  const sessions = data?.sessions ?? []
  const filteredSessions = useMemo(
    () => applyFilters(sessions, PERIOD_UNIT, periodAnchor, timeFilter),
    [sessions, periodAnchor, timeFilter],
  )
  const chartData = useMemo(() => buildChartData(filteredSessions), [filteredSessions])
  const activeCauses = useMemo(() => getActiveCauses(filteredSessions), [filteredSessions])
  const effectiveSelectedId = filteredSessions.some(s => s.session_id === selectedSessionId)
    ? selectedSessionId
    : null
  const causeChartData = useMemo(
    () => effectiveSelectedId !== null
      ? chartData.filter(e => e.sessionId === effectiveSelectedId)
      : chartData,
    [chartData, effectiveSelectedId],
  )
  const causeActiveCauses = useMemo(
    () => effectiveSelectedId !== null
      ? getActiveCauses(filteredSessions.filter(s => s.session_id === effectiveSelectedId))
      : activeCauses,
    [filteredSessions, effectiveSelectedId, activeCauses],
  )
  const selectedSession = filteredSessions.find(s => s.session_id === selectedSessionId) ?? filteredSessions[0] ?? null

  const handleChartClick = (state: unknown) => {
    const s = state as BarClickState | null
    const entry = s?.activePayload?.[0]?.payload
    if (entry?.sessionId) setSelectedSessionId(entry.sessionId)
  }

  return (
    <>
      <PageHeader />
      <main className="page-content">
        <section className="card wcam-history-stats">
          <div className="wcam-history-header">
            <div>
              <p className="wcam-history-kicker">Session History</p>
              <h3>웹캠 분석 기록</h3>
            </div>
            {sessions.length > 0 && (
              <div className="wcam-history-metrics">
                <div>
                  <span>최근 자세 점수</span>
                  <strong>{Math.round(sessions[0].good_ratio * 100)}%</strong>
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

          {!isLoading && !isError && sessions.length === 0 && (
            <div className="wcam-history-empty">
              <FontAwesomeIcon icon={faChartBar} />
              <span>저장된 웹캠 분석 기록이 없습니다.</span>
            </div>
          )}

          {!isLoading && !isError && sessions.length > 0 && (
            <div className="wcam-filter-section">
              <div className="wcam-filter-group">
                <span className="wcam-filter-label">
                  <FontAwesomeIcon icon={faCalendar} />
                  기간
                </span>
                <WcamPeriodPicker
                  anchor={periodAnchor}
                  onChange={setPeriodAnchor}
                  sessions={sessions}
                />
              </div>
              <div className="wcam-filter-group">
                <span className="wcam-filter-label">
                  <FontAwesomeIcon icon={faClock} />
                  시간대
                </span>
                <div className="wcam-filter-chips">
                  {TIME_FILTER_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`wcam-filter-chip${timeFilter === value ? ' wcam-filter-chip--active' : ''}`}
                      onClick={() => setTimeFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isError && sessions.length > 0 && chartData.length === 0 && (
            <div className="wcam-history-empty">
              <span>선택한 필터에 해당하는 세션이 없습니다.</span>
            </div>
          )}

          {!isLoading && !isError && chartData.length > 0 && (
            <>
              <p className="wcam-history-chart-label">
                자세 분포
                <span className="wcam-history-chart-hint">막대를 클릭하면 세션 상세를 볼 수 있어요</span>
              </p>
              <div className="wcam-history-chart">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} maxBarSize={56} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.22)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                    <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontFamily: 'inherit' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontFamily: 'inherit', fontSize: '0.82rem' }} />
                    <Bar dataKey="good" name="좋음" stackId="a" fill="#10b981" />
                    <Bar dataKey="warning" name="주의" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="bad" name="나쁨" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {causeActiveCauses.length > 0 && (
                <>
                  <p className="wcam-history-chart-label">
                    원인 분석
                    {effectiveSelectedId !== null && (
                      <>
                        <span className="wcam-history-chart-hint">
                          · {chartData.find(e => e.sessionId === effectiveSelectedId)?.label}
                        </span>
                        <button
                          type="button"
                          className="wcam-filter-chip wcam-filter-chip--active"
                          style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedSessionId(null)}
                        >
                          전체 보기 ×
                        </button>
                      </>
                    )}
                  </p>
                  <div className="wcam-history-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={causeChartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} maxBarSize={20} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.22)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                        <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontFamily: 'inherit' }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontFamily: 'inherit', fontSize: '0.82rem' }} />
                        {causeActiveCauses.map(key => (
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
        </section>

        {selectedSession && (
          <WcamSessionDetailCard
            session={selectedSession}
            isDeleting={isDeleting}
            isConfirmingDelete={confirmingDeleteId === selectedSession.session_id}
            onRequestDelete={() => setConfirmingDeleteId(selectedSession.session_id)}
            onCancelDelete={() => setConfirmingDeleteId(null)}
            onDelete={(id) => doDelete(id)}
          />
        )}
      </main>
    </>
  )
}
