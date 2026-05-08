import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { PhotoAnalysisResponse } from '../../services/photoAnalysisApi'

const PHOTO_NORMAL_RANGES = {
  neckForwardAngle: '정상 15° 이하',
  shoulderSlope: '정상 10° 이하',
  hipSlope: '정상 7° 이하',
  asymmetryScore: '정상 5% 이하',
}

function formatMetric(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(1)}${suffix}`
}

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
  return (
    <section className="card">
      <div className="photo-summary-header">
        <h3>{title}</h3>
        <div className="photo-summary-header-meta">
          <span className={`photo-status-chip ${result.status}`}>{result.status}</span>
          {result.issues.length > 0 && (
            <div className="photo-issue-tags photo-issue-tags--header">
              {result.issues.map((issue) => (
                <span key={issue} className="photo-issue-tag">{issue}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="photo-summary-grid">
        <div>
          <span>분석 모드</span>
          <strong>{result.analysis_mode === 'full' ? '전신' : '반신'}</strong>
        </div>
        <div>
          <span>전체 신뢰도</span>
          <strong>{Math.round(result.confidence * 100)}%</strong>
        </div>
        <div>
          <span>목 각도</span>
          <strong>{formatMetric(result.side.neck_forward_angle, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.neckForwardAngle}</small>
        </div>
        <div>
          <span>어깨 기울기</span>
          <strong>{formatMetric(result.front.shoulder_slope, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.shoulderSlope}</small>
        </div>
        <div>
          <span>골반 기울기</span>
          <strong>{formatMetric(result.front.hip_slope, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.hipSlope}</small>
        </div>
        <div>
          <span>좌우 비대칭</span>
          <strong>{formatMetric(result.front.asymmetry_score, '%')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.asymmetryScore}</small>
        </div>
      </div>
      <div className="photo-message-block photo-message-block--warning">
        <h4>
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </h4>
        <span>골반이 찍히지 않은 사진으로는 목과 어깨까지만 분석 가능해요.</span>
      </div>
      {result.missing_landmarks.length > 0 && (
        <div className="photo-message-block">
          <h4>보완이 필요한 랜드마크</h4>
          <ul>
            {result.missing_landmarks.map((landmark) => (
              <li key={landmark}>{landmark}</li>
            ))}
          </ul>
        </div>
      )}
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
    </section>
  )
}
