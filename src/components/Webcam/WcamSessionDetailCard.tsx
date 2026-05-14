import { type WebcamSessionHistoryItem } from '../../services/webcamApi'

const CAUSE_META: Record<string, { label: string; color: string }> = {
  NECK_FORWARD:   { label: '거북목',       color: '#f97316' },
  HEAD_TILT:      { label: '머리 기울어짐', color: '#a855f7' },
  SHOULDER_SLOPE: { label: '어깨 기울기',   color: '#ef4444' },
  BAD_POSTURE:    { label: '나쁜 자세',     color: '#6b7280' },
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function calcDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return ''
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 1) return '1분 미만'
  return `약 ${mins}분`
}

function scoreColor(ratio: number): string {
  if (ratio >= 0.7) return '#10b981'
  if (ratio >= 0.4) return '#f59e0b'
  return '#ef4444'
}

export default function WcamSessionDetailCard({
  session,
  isDeleting,
  isConfirmingDelete,
  onRequestDelete,
  onCancelDelete,
  onDelete,
}: {
  session: WebcamSessionHistoryItem
  isDeleting: boolean
  isConfirmingDelete: boolean
  onRequestDelete: () => void
  onCancelDelete: () => void
  onDelete: (sessionId: number) => void
}) {
  const scorePercent = Math.round(session.good_ratio * 100)
  const duration = calcDuration(session.started_at, session.ended_at)
  const topCauses = Object.entries(session.cause_counts ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <section className="card wcam-detail-card">
      <div className="wcam-detail-header">
        <div>
          <p className="wcam-history-kicker">Selected Session</p>
          <h3>
            {fmtDatetime(session.started_at)}
            {duration && <span className="wcam-detail-duration"> · {duration}</span>}
          </h3>
        </div>
        <div className="wcam-detail-score" style={{ color: scoreColor(session.good_ratio) }}>
          <strong>{scorePercent}%</strong>
          <span>자세 점수</span>
        </div>
      </div>

      {session.total_frames > 0 && (
        <div className="wcam-detail-frames">
          <div className="wcam-detail-frame-bar">
            <div style={{ flex: session.good_frames, background: '#10b981' }} title={`좋음 ${session.good_frames}프레임`} />
            <div style={{ flex: session.warning_frames, background: '#f59e0b' }} title={`주의 ${session.warning_frames}프레임`} />
            <div style={{ flex: session.bad_frames, background: '#ef4444' }} title={`나쁨 ${session.bad_frames}프레임`} />
          </div>
          <div className="wcam-detail-frame-legend">
            <span style={{ color: '#10b981' }}>좋음 {session.good_frames}</span>
            <span style={{ color: '#f59e0b' }}>주의 {session.warning_frames}</span>
            <span style={{ color: '#ef4444' }}>나쁨 {session.bad_frames}</span>
          </div>
        </div>
      )}

      {topCauses.length > 0 && (
        <div className="wcam-detail-causes">
          <p className="wcam-detail-causes-label">주요 원인</p>
          <ul>
            {topCauses.map(([key, count]) => {
              const meta = CAUSE_META[key]
              return (
                <li key={key}>
                  <span className="wcam-detail-cause-dot" style={{ background: meta?.color ?? '#94a3b8' }} />
                  <span>{meta?.label ?? key}</span>
                  <span className="wcam-detail-cause-count">{count}회</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="wcam-detail-footer">
        <button
          className="btn--danger-outline"
          type="button"
          onClick={onRequestDelete}
          disabled={isDeleting}
        >
          삭제하기
        </button>
      </div>

      {isConfirmingDelete && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__backdrop" onClick={onCancelDelete} />
          <div className="modal__card modal--xs">
            <h3>이 세션 기록을 삭제하시겠습니까?</h3>
            <p>삭제된 기록은 복구할 수 없습니다.</p>
            <div className="wcam-detail-modal-actions">
              <button className="btn--secondary" type="button" onClick={onCancelDelete} disabled={isDeleting}>
                취소
              </button>
              <button className="btn--danger" type="button" onClick={() => onDelete(session.session_id)} disabled={isDeleting}>
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
