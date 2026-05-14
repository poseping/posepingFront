import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import type { ApexOptions } from 'apexcharts'
import ReactApexChart from 'react-apexcharts'
import { getPhotoAnalysisHistory } from '../../services/photoAnalysisApi'
import '../../styles/components/history-summary-cards.scss'

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

    const scorePoints = analyses
      .map((analysis) => {
        const rawDate = analysis.saved_at ?? analysis.analyzed_at ?? analysis.created_at ?? ''
        const date = rawDate ? new Date(rawDate) : null
        const score = typeof analysis.posture_score === 'number' && Number.isFinite(analysis.posture_score)
          ? Math.round(analysis.posture_score)
          : null

        if (!date || Number.isNaN(date.getTime()) || score === null) {
          return null
        }

        return {
          score,
          time: date.getTime(),
        }
      })
      .filter((item): item is { score: number; time: number } => item !== null)
      .sort((a, b) => a.time - b.time)
      .slice(-10)

    if (!scorePoints.length) {
      return null
    }

    const latest = scorePoints[scorePoints.length - 1]

    return {
      latestScore: latest.score,
      points: scorePoints.map((point) => ({
        x: new Date(point.time).toISOString(),
        y: point.score,
      })),
    }
  }, [photoData])

  const chartOptions = useMemo<ApexOptions>(() => ({
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
    },
    colors: ['#008FFB'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 4,
    },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.18)',
      strokeDashArray: 0,
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    xaxis: {
      type: 'datetime',
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        datetimeUTC: false,
        format: 'MM.dd',
        style: {
          colors: '#64748b',
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '12px',
        },
        formatter: (value) => `${Math.round(value)}`,
      },
    },
    markers: {
      size: 0,
    },
    tooltip: {
      theme: 'light',
      x: {
        format: 'MM/dd',
      },
      y: {
        formatter: (value) => `${Math.round(value)}점`,
      },
    },
    legend: { show: false },
  }), [photoStats])

  const chartSeries = useMemo(
    () => [
      {
        name: '신체 점수',
        data: photoStats?.points ?? [],
      },
    ],
    [photoStats]
  )

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
          <div className="history-score-summary">
            <span>최신 신체 점수</span>
            <strong>{photoStats.latestScore}점</strong>
          </div>
          <div className="history-score-chart">
            <ReactApexChart
              type="area"
              height={350}
              options={chartOptions}
              series={chartSeries}
            />
          </div>
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
