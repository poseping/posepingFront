import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { getPhotoAnalysisHistory } from '../../services/photoAnalysisApi'
import '../../styles/components/history-summary-cards.scss'

function daysAgo(isoStr: string) {
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

export default function HistorySummaryCards() {
  const navigate = useNavigate()

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

  return (
    <section className="card">
      <p className="history-kicker">Photo Analysis</p>
      <h3 className="history-stats-title" style={{ marginBottom: '1.25rem' }}>사진 분석 통계</h3>

      {photoLoading && <div className="history-stats-empty">불러오는 중...</div>}

      {!photoLoading && !photoStats && (
        <div className="history-stats-empty">저장된 사진 분석 기록이 없습니다.</div>
      )}

      {!photoLoading && photoStats && (
        <>
          <div className="history-metrics">
            <div className="history-metric">
              <span>총 분석</span>
              <strong>{photoStats.total}건</strong>
            </div>
            <div className="history-metric">
              <span>거북목 감지</span>
              <strong className={`history-score ${photoStats.neckRate != null && photoStats.neckRate >= 50 ? 'bad' : photoStats.neckRate != null && photoStats.neckRate >= 25 ? 'warning' : 'good'}`}>
                {photoStats.neckRate != null ? `${photoStats.neckRate}%` : '-'}
              </strong>
            </div>
            <div className="history-metric">
              <span>마지막 분석</span>
              <strong>{photoStats.lastDate ? daysAgo(photoStats.lastDate) : '-'}</strong>
            </div>
          </div>

          {photoStats.loaded > 0 && (
            <div className="history-bar-section">
              <p className="history-bar-label">자세 등급 분포</p>
              <div className="history-stacked-bar">
                <div className="history-bar-good" style={{ width: `${(photoStats.good / photoStats.loaded) * 100}%` }} />
                <div className="history-bar-warning" style={{ width: `${(photoStats.warning / photoStats.loaded) * 100}%` }} />
                <div className="history-bar-bad" style={{ width: `${(photoStats.bad / photoStats.loaded) * 100}%` }} />
              </div>
              <div className="history-bar-legend">
                <span className="history-legend-item good">좋음 {Math.round((photoStats.good / photoStats.loaded) * 100)}%</span>
                <span className="history-legend-item warning">주의 {Math.round((photoStats.warning / photoStats.loaded) * 100)}%</span>
                <span className="history-legend-item bad">나쁨 {Math.round((photoStats.bad / photoStats.loaded) * 100)}%</span>
              </div>
            </div>
          )}
        </>
      )}

      <div className="history-summary-footer">
        <button className="btn--tonal" onClick={() => navigate('/photo/stats')}>
          자세히 보기 <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </section>
  )
}
