import { type PhotoAnalysisHistoryItem } from '../../services/photoAnalysisApi'
import PhotoAnalysisSummaryCard from './PhotoAnalysisSummaryCard'
import {
  formatAnalysisMode,
  formatHistoryDate,
  formatMetric,
  getNumericMetric,
  PHOTO_NORMAL_RANGES,
} from './photoSummary'

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
  const craniovertebralAngle = getNumericMetric(item.side?.craniovertebral_angle ?? item.craniovertebral_angle)
  const shoulderSlope = getMetric(item, 'shoulder_slope', 'shoulder_slope')
  const hipSlope = getMetric(item, 'hip_slope', 'hip_slope')
  const spineAlignment = getMetric(item, 'spine_alignment', 'spine_alignment')
  const alerts = item.alerts ?? []
  const issues = item.issues ?? []
  const missingLandmarks = item.missing_landmarks ?? []
  const aiMessage = item.ai_message?.trim()
  const metrics = [
    {
      label: '분석 모드',
      value: formatAnalysisMode(item.analysis_mode),
    },
    {
      label: '전체 신뢰도',
      value: confidence === null ? '-' : `${Math.round(confidence * 100)}%`,
    },
    {
      label: craniovertebralAngle === null ? '목 각도' : 'CVA 추정값',
      value: formatMetric(craniovertebralAngle ?? neckForwardAngle, '°'),
      range: craniovertebralAngle === null ? '이전 기록 기준값' : PHOTO_NORMAL_RANGES.craniovertebralAngle,
    },
    {
      label: '어깨 기울기',
      value: formatMetric(shoulderSlope, '°'),
      range: PHOTO_NORMAL_RANGES.shoulderSlope,
    },
    {
      label: '골반 기울기',
      value: formatMetric(hipSlope, '°'),
      range: PHOTO_NORMAL_RANGES.hipSlope,
    },
    {
      label: '어깨-골반 정렬',
      value: formatMetric(spineAlignment),
      range: PHOTO_NORMAL_RANGES.spineAlignment,
    },
  ]

  return (
    <PhotoAnalysisSummaryCard
      className="photo-history-selected-record"
      header={(
        <div>
          <p className="photo-kicker">Selected Record</p>
          <h3>{formatHistoryDate(item)} 기록</h3>
        </div>
      )}
      status={item.status}
      issues={issues}
      metrics={metrics}
      alerts={alerts}
      missingLandmarks={missingLandmarks}
      assistantContent={aiMessage ? (
        <div className="photo-message-block photo-message-block--assistant">
          <h4>AI 코멘트</h4>
          <p>{aiMessage}</p>
        </div>
      ) : undefined}
      footer={(
        <>
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
        </>
      )}
    />
  )
}
