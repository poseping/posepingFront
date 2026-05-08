import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowsLeftRight, faPersonWalking } from '@fortawesome/free-solid-svg-icons'
import { PhotoAnalysisResponse } from '../../services/photoAnalysisApi'
import PhotoAnalysisSummaryCard from './PhotoAnalysisSummaryCard'
import { formatMetric, PHOTO_NORMAL_RANGES } from './photoSummary'

const RESULT_ISSUE_CARD_CONFIGS = [
  {
    key: 'neck',
    label: '거북목',
    valueLabel: 'CVA 추정값',
    icon: faPersonWalking,
    className: 'photo-result-issue-card--neck',
    matches: (issue: string) => issue.includes('거북목'),
  },
  {
    key: 'asymmetry',
    label: '좌우비대칭',
    valueLabel: '좌우 비대칭',
    icon: faArrowsLeftRight,
    className: 'photo-result-issue-card--asymmetry',
    matches: (issue: string) => issue.includes('좌우') || issue.includes('비대칭'),
  },
] as const

export default function PhotoAnalysisResultSummary({
  title,
  result,
  assistantComment,
  assistantCommentError,
  isAssistantCommentPending,
}: {
  title: string
  result: PhotoAnalysisResponse
  assistantComment: string | null
  assistantCommentError: string | null
  isAssistantCommentPending: boolean
}) {
  const craniovertebralAngle = result.side.craniovertebral_angle ?? null
  const metrics = [
    {
      label: '분석 모드',
      value: result.analysis_mode === 'full' ? '전신' : '반신',
    },
    {
      label: '전체 신뢰도',
      value: `${Math.round(result.confidence * 100)}%`,
    },
    {
      label: 'CVA 추정값',
      value: formatMetric(craniovertebralAngle, '°'),
      range: PHOTO_NORMAL_RANGES.craniovertebralAngle,
    },
    {
      label: '어깨 기울기',
      value: formatMetric(result.front.shoulder_slope, '°'),
      range: PHOTO_NORMAL_RANGES.shoulderSlope,
    },
    {
      label: '골반 기울기',
      value: formatMetric(result.front.hip_slope, '°'),
      range: PHOTO_NORMAL_RANGES.hipSlope,
    },
    {
      label: '어깨-골반 정렬',
      value: formatMetric(result.front.spine_alignment),
      range: PHOTO_NORMAL_RANGES.spineAlignment,
    },
  ]
  const issueCards = RESULT_ISSUE_CARD_CONFIGS.map((config) => {
    const matchedIssue = result.issues.find(config.matches)
    const metricValue =
      config.key === 'neck'
        ? formatMetric(craniovertebralAngle, '°')
        : formatMetric(result.front.asymmetry_score, '%')

    return (
      <div
        key={config.key}
        className={`photo-result-issue-card ${config.className}${matchedIssue ? ' is-active' : ''}`}
      >
        <div className="photo-result-issue-card__icon" aria-hidden="true">
          <FontAwesomeIcon icon={config.icon} />
        </div>
        <strong>{config.label}</strong>
        <div className="photo-result-issue-card__value">
          <span>{config.valueLabel}</span>
          <b>{metricValue}</b>
        </div>
        {matchedIssue && <span className="photo-result-issue-card__badge">이슈 감지</span>}
      </div>
    )
  })
  const fallbackIssues = result.issues.filter(
    (issue) => !RESULT_ISSUE_CARD_CONFIGS.some((config) => config.matches(issue))
  )

  return (
    <PhotoAnalysisSummaryCard
      className="photo-analysis-result-card"
      header={<h3>{title}</h3>}
      status={result.status}
      issues={result.issues}
      issueContent={
        <>
          {issueCards.length > 0 && (
            <div className="photo-result-issue-cards">
              {issueCards}
            </div>
          )}
          {fallbackIssues.length > 0 && (
            <div className="photo-issue-tags photo-issue-tags--header">
              {fallbackIssues.map((issue) => (
                <span key={issue} className="photo-issue-tag">{issue}</span>
              ))}
            </div>
          )}
        </>
      }
      metrics={metrics}
      warningMessage={
        result.analysis_mode === 'upper_body_only'
          ? '골반이 찍히지 않은 사진으로는 목과 어깨까지만 분석 가능해요.'
          : undefined
      }
      missingLandmarks={result.missing_landmarks}
      assistantContent={(
        <div className="photo-message-block photo-message-block--assistant">
          <h4>AI 코멘트</h4>
          {isAssistantCommentPending && !assistantComment ? (
            <p className="photo-message-muted">코멘트를 작성하는 중입니다...</p>
          ) : assistantCommentError ? (
            <p className="photo-message-error">{assistantCommentError}</p>
          ) : assistantComment ? (
            <p>{assistantComment}</p>
          ) : (
            <p className="photo-message-muted">최종 분석이 완료되면 맞춤 코멘트를 보여드릴게요.</p>
          )}
        </div>
      )}
    />
  )
}
