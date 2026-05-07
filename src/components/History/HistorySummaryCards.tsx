import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { getPhotoAnalysisHistory } from '../../services/photoAnalysisApi'
import { getWebcamHistoryByPeriod, type HistoryPeriod } from '../../services/webcamApi'
import '../../styles/my-page.scss'

type Period = HistoryPeriod

const PERIOD_LABELS: Record<Period, string> = { day: '오늘', week: '이번 주', month: '이번 달' }

const CAUSE_LABELS: Record<string, string> = {
  NECK_FORWARD: '거북목',
  HEAD_TILT: '머리 기울어짐',
  SHOULDER_SLOPE: '어깨 기울기',
  HIP_DEVIATION: '골반 틀어짐',
  BAD_POSTURE: '나쁜 자세',
}

function daysAgo(isoStr: string) {
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

export default function HistorySummaryCards() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('week')

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['webcam-history-summary', period],
    queryFn: () => getWebcamHistoryByPeriod(period),
    staleTime: 5 * 60 * 1000,
  })

  const sessions = historyData?.sessions ?? []

  const stats = useMemo(() => {
    if (!sessions.length) return null
    const good = sessions.reduce((sum, session) => sum + session.good_count, 0)
    const warning = sessions.reduce((sum, session) => sum + session.warning_count, 0)
    const bad = sessions.reduce((sum, session) => sum + session.bad_count, 0)
    const total = good + warning + bad
    const avgScore = total ? Math.round((good / total) * 100) : 0
    const causeSums: Record<string, number> = {}

    sessions.forEach((session) => {
      if (!session.cause_counts) return
      Object.entries(session.cause_counts).forEach(([key, value]) => {
        causeSums[key] = (causeSums[key] ?? 0) + value
      })
    })

    return { sessionCount: sessions.length, total, good, warning, bad, avgScore, causeSums }
  }, [sessions])

  const { data: photoData, isLoading: photoLoading } = useQuery({
    queryKey: ['photo-analysis-history-summary'],
    queryFn: getPhotoAnalysisHistory,
    staleTime: 5 * 60 * 1000,
  })

  const photoStats = useMemo(() => {
    const analyses = photoData ?? []
    if (!analyses.length) return null

    const good = analyses.filter((analysis) => analysis.status === 'good').length
    const warning = analyses.filter((analysis) => analysis.status === 'warning').length
    const bad = analyses.filter((analysis) => analysis.status === 'bad').length
    const withNeck = analyses.filter((analysis) => analysis.side?.forward_head_detected != null)
    const neckRate = withNeck.length
      ? Math.round((withNeck.filter((analysis) => analysis.side?.forward_head_detected).length / withNeck.length) * 100)
      : null
    const dates = analyses
      .map((analysis) => analysis.analyzed_at ?? analysis.created_at ?? '')
      .filter(Boolean)
      .sort()
    const lastDate = dates.length ? dates[dates.length - 1] : null

    return { total: analyses.length, loaded: analyses.length, good, warning, bad, neckRate, lastDate }
  }, [photoData])

  const scoreClass =
    !stats ? '' :
      stats.avgScore >= 80 ? 'good' :
        stats.avgScore >= 50 ? 'warning' : 'bad'

  return (
    <>
      <section className="card">
        <div className="mp-stats-header">
          <div>
            <p className="mp-kicker">My Stats</p>
            <h3 className="mp-stats-title">자세 통계</h3>
          </div>
          <div className="mp-period-tabs">
            {(['day', 'week', 'month'] as Period[]).map((nextPeriod) => (
              <button
                key={nextPeriod}
                className={`mp-period-tab${period === nextPeriod ? ' active' : ''}`}
                onClick={() => setPeriod(nextPeriod)}
              >
                {PERIOD_LABELS[nextPeriod]}
              </button>
            ))}
          </div>
        </div>

        {historyLoading && <div className="mp-stats-empty">불러오는 중...</div>}

        {!historyLoading && !stats && (
          <div className="mp-stats-empty">{PERIOD_LABELS[period]} 분석 기록이 없습니다.</div>
        )}

        {!historyLoading && stats && (
          <>
            <div className="mp-metrics">
              <div className="mp-metric">
                <span>세션</span>
                <strong>{stats.sessionCount}회</strong>
              </div>
              <div className="mp-metric">
                <span>분석 프레임</span>
                <strong>{stats.total.toLocaleString()}개</strong>
              </div>
              <div className="mp-metric">
                <span>평균 자세 점수</span>
                <strong className={`mp-score ${scoreClass}`}>{stats.avgScore}%</strong>
              </div>
            </div>

            {stats.total > 0 && (
              <div className="mp-bar-section">
                <p className="mp-bar-label">자세 분포</p>
                <div className="mp-stacked-bar">
                  <div className="mp-bar-good" style={{ width: `${(stats.good / stats.total) * 100}%` }} />
                  <div className="mp-bar-warning" style={{ width: `${(stats.warning / stats.total) * 100}%` }} />
                  <div className="mp-bar-bad" style={{ width: `${(stats.bad / stats.total) * 100}%` }} />
                </div>
                <div className="mp-bar-legend">
                  <span className="mp-legend-item good">좋음 {Math.round((stats.good / stats.total) * 100)}%</span>
                  <span className="mp-legend-item warning">경고 {Math.round((stats.warning / stats.total) * 100)}%</span>
                  <span className="mp-legend-item bad">나쁨 {Math.round((stats.bad / stats.total) * 100)}%</span>
                </div>
              </div>
            )}

            {Object.keys(stats.causeSums).length > 0 && (
              <div className="mp-causes">
                <p className="mp-bar-label">주요 원인</p>
                <div className="mp-cause-list">
                  {Object.entries(stats.causeSums)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, count]) => (
                      <span key={key} className="mp-cause-chip">
                        {CAUSE_LABELS[key] ?? key}
                        <strong>{count}회</strong>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mp-habit-footer">
          <button className="btn--tonal" onClick={() => navigate('/main')}>
            자세히 보기 <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </section>

      <section className="card">
        <p className="mp-kicker">Photo Analysis</p>
        <h3 className="mp-stats-title" style={{ marginBottom: '1.25rem' }}>사진 자세 현황</h3>

        {photoLoading && <div className="mp-stats-empty">불러오는 중...</div>}

        {!photoLoading && !photoStats && (
          <div className="mp-stats-empty">저장된 사진 분석 기록이 없습니다.</div>
        )}

        {!photoLoading && photoStats && (
          <>
            <div className="mp-metrics">
              <div className="mp-metric">
                <span>총 분석</span>
                <strong>{photoStats.total}회</strong>
              </div>
              <div className="mp-metric">
                <span>거북목 감지</span>
                <strong className={`mp-score ${photoStats.neckRate != null && photoStats.neckRate >= 50 ? 'bad' : photoStats.neckRate != null && photoStats.neckRate >= 25 ? 'warning' : 'good'}`}>
                  {photoStats.neckRate != null ? `${photoStats.neckRate}%` : '-'}
                </strong>
              </div>
              <div className="mp-metric">
                <span>마지막 분석</span>
                <strong>{photoStats.lastDate ? daysAgo(photoStats.lastDate) : '-'}</strong>
              </div>
            </div>

            {photoStats.loaded > 0 && (
              <div className="mp-bar-section">
                <p className="mp-bar-label">자세 등급 분포</p>
                <div className="mp-stacked-bar">
                  <div className="mp-bar-good" style={{ width: `${(photoStats.good / photoStats.loaded) * 100}%` }} />
                  <div className="mp-bar-warning" style={{ width: `${(photoStats.warning / photoStats.loaded) * 100}%` }} />
                  <div className="mp-bar-bad" style={{ width: `${(photoStats.bad / photoStats.loaded) * 100}%` }} />
                </div>
                <div className="mp-bar-legend">
                  <span className="mp-legend-item good">좋음 {Math.round((photoStats.good / photoStats.loaded) * 100)}%</span>
                  <span className="mp-legend-item warning">주의 {Math.round((photoStats.warning / photoStats.loaded) * 100)}%</span>
                  <span className="mp-legend-item bad">나쁨 {Math.round((photoStats.bad / photoStats.loaded) * 100)}%</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mp-habit-footer">
          <button className="btn--tonal" onClick={() => navigate('/history/photo-stats')}>
            자세히 보기 <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </section>
    </>
  )
}
