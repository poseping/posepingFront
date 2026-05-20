import { useMemo } from 'react'
import type { ApexOptions } from 'apexcharts'
import ReactApexChart from 'react-apexcharts'
import type { AlertType } from '../../services/webcamApi'
import '../../styles/components/wcam-session-summary.scss'

const CAUSE_COLOR: Record<string, string> = {
  NECK_FORWARD:   '#f97316',
  HEAD_TILT:      '#a855f7',
  SHOULDER_SLOPE: '#ef4444',
  HIP_DEVIATION:  '#eab308',
  BAD_POSTURE:    '#6b7280',
}

interface Props {
  goodCount: number
  warningCount: number
  badCount: number
  causeCounts: Record<string, number>
  alertMap: Record<string, AlertType>
  prevGoodRatio: number | null
  assistantComment: string | null
  goodFrames: number
  warningFrames: number
  totalFrames: number
  onRestart: () => void
}

export default function WcamSessionSummaryChart({
  goodCount, warningCount, badCount,
  causeCounts, alertMap,
  prevGoodRatio, assistantComment,
  goodFrames, warningFrames, totalFrames,
  onRestart,
}: Props) {
  const total = goodCount + warningCount + badCount
  const thisRatio = totalFrames > 0
    ? Math.round(((goodFrames * 1.0 + warningFrames * 0.5) / totalFrames) * 100)
    : 0
  const prevPct = prevGoodRatio !== null ? Math.round(prevGoodRatio * 100) : null
  const delta = prevPct !== null ? thisRatio - prevPct : null

  const chartColor =
    thisRatio >= 70 ? '#10b981' :
    thisRatio >= 40 ? '#f59e0b' :
    '#ef4444'

  const chartOptions = useMemo<ApexOptions>(() => ({
    chart: {
      type: 'radialBar',
      fontFamily: 'inherit',
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
    },
    colors: [chartColor],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '60%' },
        track: { background: '#f1f5f9', strokeWidth: '100%', margin: 0 },
        dataLabels: {
          name: {
            show: true,
            offsetY: 22,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#94a3b8',
          },
          value: {
            fontSize: '2.1rem',
            fontWeight: 800,
            color: '#10213d',
            offsetY: -12,
            formatter: (val) => `${Math.round(val)}%`,
          },
        },
      },
    },
    labels: ['좋은 자세'],
  }), [chartColor])

  const topCauses = Object.entries(causeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <section className="card wcam-session-summary">
      <p className="wcam-session-summary__kicker">Session Result</p>
      <h3 className="wcam-session-summary__title">이번 세션 결과</h3>

      {total === 0 ? (
        <p className="wcam-session-summary__empty">분석 데이터가 없습니다.</p>
      ) : (
        <>
          <div className="wcam-session-summary__chart">
            <ReactApexChart
              type="radialBar"
              height={200}
              options={chartOptions}
              series={[thisRatio]}
            />
          </div>

          {delta !== null && (
            <div className="wcam-session-summary__delta">
              <span>직전 세션 대비</span>
              <strong style={{ color: delta >= 0 ? 'var(--success)' : 'var(--destructive)' }}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
              </strong>
            </div>
          )}

          <div className="wcam-session-summary__counts">
            <div className="wcam-session-summary__count wcam-session-summary__count--good">
              <span className="wcam-session-summary__count-value">{goodCount}회</span>
              <span className="wcam-session-summary__count-label">좋음</span>
            </div>
            <div className="wcam-session-summary__count wcam-session-summary__count--warning">
              <span className="wcam-session-summary__count-value">{warningCount}회</span>
              <span className="wcam-session-summary__count-label">주의</span>
            </div>
            <div className="wcam-session-summary__count wcam-session-summary__count--bad">
              <span className="wcam-session-summary__count-value">{badCount}회</span>
              <span className="wcam-session-summary__count-label">불량</span>
            </div>
          </div>

          {topCauses.length > 0 && (
            <div className="wcam-session-summary__causes">
              <p className="wcam-session-summary__causes-title">주요 원인</p>
              <ul>
                {topCauses.map(([typeId, count]) => (
                  <li key={typeId}>
                    <span style={{ color: CAUSE_COLOR[typeId] ?? '#94a3b8' }}>●</span>
                    {alertMap[typeId]?.alert_name ?? typeId}
                    <span className="wcam-session-summary__cause-count">{count}회</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assistantComment && (
            <div className="wcam-session-summary__comment">
              <p className="wcam-session-summary__comment-kicker">마지막 AI 코멘트</p>
              <div className="wcam-session-summary__comment-bubble">{assistantComment}</div>
            </div>
          )}
        </>
      )}
      <div className="wcam-session-summary__actions">
        <button className="btn--secondary btn--lg" onClick={onRestart}>
          재시작
        </button>
      </div>
    </section>
  )
}
