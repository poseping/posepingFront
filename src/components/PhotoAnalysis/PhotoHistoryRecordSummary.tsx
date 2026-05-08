import { type PhotoAnalysisHistoryItem } from '../../services/photoAnalysisApi'

const PHOTO_NORMAL_RANGES = {
  neckForwardAngle: '정상 15° 이하',
  shoulderSlope: '정상 10° 이하',
  hipSlope: '정상 7° 이하',
  asymmetryScore: '정상 5% 이하',
}

function getNumericMetric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatMetric(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(1)}${suffix}`
}

function getHistoryDate(item: PhotoAnalysisHistoryItem) {
  return item.saved_at ?? item.analyzed_at ?? item.created_at ?? ''
}

function formatHistoryDate(item: PhotoAnalysisHistoryItem) {
  const dateValue = getHistoryDate(item)
  const date = dateValue ? new Date(dateValue) : null

  if (!date || Number.isNaN(date.getTime())) {
    return '날짜 정보 없음'
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAnalysisMode(mode: PhotoAnalysisHistoryItem['analysis_mode']) {
  if (mode === 'full') {
    return '전신'
  }

  if (mode === 'upper_body_only') {
    return '반신'
  }

  if (mode === 'manual_adjustment_required') {
    return '수동 보정'
  }

  return '-'
}

function getMetric(
  item: PhotoAnalysisHistoryItem,
  metricKey: keyof NonNullable<PhotoAnalysisHistoryItem['front']>,
  fallbackKey: keyof PhotoAnalysisHistoryItem
) {
  return getNumericMetric(item.front?.[metricKey] ?? item[fallbackKey])
}

export default function PhotoHistoryRecordSummary({
  item,
  isDeleting,
  isConfirmingDelete,
  onRequestDelete,
  onCancelDelete,
  onDelete,
}: {
  item: PhotoAnalysisHistoryItem
  isDeleting: boolean
  isConfirmingDelete: boolean
  onRequestDelete: () => void
  onCancelDelete: () => void
  onDelete: (item: PhotoAnalysisHistoryItem) => void
}) {
  const confidence = getNumericMetric(item.confidence)
  const neckForwardAngle = getNumericMetric(item.side?.neck_forward_angle ?? item.neck_forward_angle)
  const shoulderSlope = getMetric(item, 'shoulder_slope', 'shoulder_slope')
  const hipSlope = getMetric(item, 'hip_slope', 'hip_slope')
  const asymmetryScore = getMetric(item, 'asymmetry_score', 'asymmetry_score')
  const alerts = item.alerts ?? []
  const issues = item.issues ?? []
  const missingLandmarks = item.missing_landmarks ?? []
  const aiMessage = item.ai_message?.trim()

  return (
    <section className="card photo-history-selected-record">
      <div className="photo-summary-header">
        <div>
          <p className="photo-kicker">Selected Record</p>
          <h3>{formatHistoryDate(item)} 기록</h3>
        </div>
        <div className="photo-summary-header-meta">
          {item.status && <span className={`photo-status-chip ${item.status}`}>{item.status}</span>}
          {issues.length > 0 && (
            <div className="photo-issue-tags photo-issue-tags--header">
              {issues.map((issue) => (
                <span key={issue} className="photo-issue-tag">{issue}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="photo-summary-grid">
        <div>
          <span>분석 모드</span>
          <strong>{formatAnalysisMode(item.analysis_mode)}</strong>
        </div>
        <div>
          <span>전체 신뢰도</span>
          <strong>{confidence === null ? '-' : `${Math.round(confidence * 100)}%`}</strong>
        </div>
        <div>
          <span>목 각도</span>
          <strong>{formatMetric(neckForwardAngle, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.neckForwardAngle}</small>
        </div>
        <div>
          <span>어깨 기울기</span>
          <strong>{formatMetric(shoulderSlope, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.shoulderSlope}</small>
        </div>
        <div>
          <span>골반 기울기</span>
          <strong>{formatMetric(hipSlope, '°')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.hipSlope}</small>
        </div>
        <div>
          <span>좌우 비대칭</span>
          <strong>{formatMetric(asymmetryScore, '%')}</strong>
          <small className="photo-summary-range">{PHOTO_NORMAL_RANGES.asymmetryScore}</small>
        </div>
      </div>
      {alerts.length > 0 && (
        <div className="photo-message-block">
          <h4>알림</h4>
          <ul>
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      )}
      {missingLandmarks.length > 0 && (
        <div className="photo-message-block">
          <h4>보완이 필요한 랜드마크</h4>
          <ul>
            {missingLandmarks.map((landmark) => (
              <li key={landmark}>{landmark}</li>
            ))}
          </ul>
        </div>
      )}
      {aiMessage && (
        <div className="photo-message-block photo-message-block--assistant">
          <h4>AI 코멘트</h4>
          <p>{aiMessage}</p>
        </div>
      )}
      <div className="photo-history-delete-actions">
        <button
          className="btn--danger-outline photo-history-delete-button"
          type="button"
          onClick={onRequestDelete}
        >
          삭제하기
        </button>
      </div>
      {isConfirmingDelete && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="photo-delete-title">
          <div className="modal__backdrop" onClick={onCancelDelete} />
          <div className="modal__card modal--xs photo-history-delete-modal">
            <h3 id="photo-delete-title">해당 기록을 삭제하시겠습니까?</h3>
            <div className="photo-history-delete-modal__actions">
              <button
                className="btn--secondary"
                type="button"
                onClick={onCancelDelete}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                className="btn--danger"
                type="button"
                onClick={() => onDelete(item)}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

