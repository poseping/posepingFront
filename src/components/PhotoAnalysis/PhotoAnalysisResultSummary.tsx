import { PhotoAnalysisResponse } from '../../services/photoAnalysisApi'
import PhotoAnalysisSummaryCard from './PhotoAnalysisSummaryCard'
import { formatMetric, formatScoreGrade, getScoreGradeClassName, PHOTO_NORMAL_RANGES } from './photoSummary'
import PhotoIssueCards, { filterFallbackIssues } from './PhotoIssueCards'

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
      infoText:
        'CVA는 거북목을 판단하는 데에 사용하는 지표입니다. 경추와 귀의 이주(Tragus)를 그은 선이 경추를 기준으로 그은 수평선과 이루는 각도를 나타냅니다. 간이 분석에서는 실제 정확한 수평선을 판정하기 어렵기 때문에 추정값을 대신 표시합니다.',
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
  const fallbackIssues = filterFallbackIssues(result.issues)

  return (
    <PhotoAnalysisSummaryCard
      className="photo-analysis-result-card"
      header={<h3>{title}</h3>}
      status={result.status}
      issues={result.issues}
      issueContent={
        <>
          <PhotoIssueCards
            issues={result.issues}
            craniovertebralAngle={craniovertebralAngle}
            asymmetryScore={result.front.asymmetry_score}
          />
          {fallbackIssues.length > 0 && (
            <div className="photo-issue-tags photo-issue-tags--header">
              {fallbackIssues.map((issue) => (
                <span key={issue} className="photo-issue-tag">{issue}</span>
              ))}
            </div>
          )}
        </>
      }
      preGridContent={
        <>
          <div className={`photo-message-block photo-message-block--score ${getScoreGradeClassName(result.score_grade)}`.trim()}>
            <h4>신체 점수</h4>
            <div className={`photo-score-content ${getScoreGradeClassName(result.score_grade)}`.trim()}>
              <strong>{result.posture_score === null ? '-' : `${result.posture_score}점`}</strong>
              {result.score_grade && <span>{formatScoreGrade(result.score_grade)}</span>}
            </div>
          </div>
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
        </>
      }
      metrics={metrics}
      warningMessage={
        result.analysis_mode === 'upper_body_only'
          ? '골반이 찍히지 않은 사진으로는 목과 어깨까지만 분석 가능해요.'
          : undefined
      }
      missingLandmarks={result.missing_landmarks}
    />
  )
}
