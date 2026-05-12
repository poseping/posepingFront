import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { PostureProfile } from '../../services/webcamApi'

const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3],
  [0, 4], [4, 5], [5, 6],
  [0, 7], [7, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
] as const

interface LandmarkRaw {
  x: number
  y: number
  visibility: number
}

function drawModalSkeleton(canvas: HTMLCanvasElement, landmarks: LandmarkRaw[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx || !landmarks.length) return

  const W = 320
  const H = 240
  canvas.width = W
  canvas.height = H

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, W, H)

  const color = '#22c55e'

  ctx.strokeStyle = color
  ctx.lineWidth = 2
  SKELETON_CONNECTIONS.forEach(([s, e]) => {
    const a = landmarks[s]
    const b = landmarks[e]
    if (!a || !b || (a.visibility ?? 1) < 0.3 || (b.visibility ?? 1) < 0.3) return
    ctx.beginPath()
    ctx.moveTo(a.x * W, a.y * H)
    ctx.lineTo(b.x * W, b.y * H)
    ctx.stroke()
  })

  landmarks.forEach((lm) => {
    ctx.fillStyle = (lm.visibility ?? 1) > 0.5 ? color : '#60a5fa'
    ctx.beginPath()
    ctx.arc(lm.x * W, lm.y * H, 4, 0, 2 * Math.PI)
    ctx.fill()
  })
}

function formatDateLong(isoString: string) {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface Props {
  profile: PostureProfile
  onClose: () => void
  onUpdate: (data: { profile_name?: string; is_active?: boolean }) => Promise<void>
  onDelete: () => Promise<void>
  editable?: boolean
}

export default function PostureProfileModal({ profile, onClose, onUpdate, onDelete, editable = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(profile.profile_name)
  const [isActive, setIsActive] = useState(profile.is_active)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const raw = profile.reference_landmarks as { landmarks?: LandmarkRaw[] }
    drawModalSkeleton(canvasRef.current, raw.landmarks ?? [])
  }, [profile])

  const handleToggleActive = async () => {
    const next = !isActive
    setIsActive(next)
    setErrorMsg(null)
    try {
      await onUpdate({ is_active: next })
    } catch (err: unknown) {
      setIsActive(!next)
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErrorMsg(detail ?? '변경에 실패했습니다.')
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === profile.profile_name) {
      setEditingName(false)
      setNameValue(profile.profile_name)
      return
    }
    setSaving(true)
    try {
      await onUpdate({ profile_name: trimmed })
    } finally {
      setSaving(false)
      setEditingName(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    await onDelete()
  }

  return (
    <div className="wcam-modal-overlay" onClick={onClose}>
      <div className="wcam-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="wcam-modal-header">
          {editingName && editable ? (
            <div className="wcam-modal-name-edit">
              <input
                className="wcam-modal-name-input"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button className="btn--primary btn--sm" onClick={handleSaveName} disabled={saving}>
                {saving ? '저장 중' : '저장'}
              </button>
              <button
                className="btn--secondary btn--sm"
                onClick={() => { setEditingName(false); setNameValue(profile.profile_name) }}
              >
                취소
              </button>
            </div>
          ) : (
            <div className="wcam-modal-name-row">
              <h2 className="wcam-modal-title">{nameValue}</h2>
              {editable && (
                <button className="btn-icon" onClick={() => setEditingName(true)} title="이름 수정">
                  <FontAwesomeIcon icon={faPen} />
                </button>
              )}
            </div>
          )}
          <button className="btn-icon btn-icon--circle" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="wcam-modal-meta-row">
          <span className="wcam-modal-meta">등록일 {formatDateLong(profile.created_at)}</span>
          <span className="wcam-modal-meta">수정일 {formatDateLong(profile.updated_at)}</span>
        </div>

        {/* 스켈레톤 미리보기 */}
        <div className="wcam-modal-skeleton-wrap">
          <canvas ref={canvasRef} className="wcam-modal-canvas" />
          <p className="wcam-modal-skeleton-label">기준 자세 미리보기</p>
        </div>

        {/* 활성화 토글 */}
        <div className="wcam-modal-divider" />
        <div className="wcam-modal-toggle-row">
          <div className="wcam-modal-toggle-text">
            <span className="wcam-modal-toggle-label">분석에 사용</span>
            <span className="wcam-modal-toggle-desc">
              {isActive ? '현재 자세 분석에 활용됩니다' : '분석에서 제외됩니다'}
            </span>
          </div>
          <button
            className={`wcam-toggle-switch ${isActive ? 'on' : 'off'}`}
            onClick={handleToggleActive}
            aria-label={isActive ? '비활성화' : '활성화'}
            disabled={!editable}
            style={!editable ? { opacity: 0.5, cursor: 'default' } : undefined}
          />
        </div>
        {errorMsg && <p className="wcam-modal-error">{errorMsg}</p>}

        {/* 삭제 */}
        {editable && <div className="wcam-modal-divider" />}
        {editable && (confirmDelete ? (
          <div className="wcam-modal-confirm">
            <p className="wcam-modal-confirm-text">이 기준 자세를 삭제할까요? 되돌릴 수 없습니다.</p>
            <div className="wcam-modal-confirm-row">
              <button className="btn--secondary btn--sm" onClick={() => setConfirmDelete(false)}>
                취소
              </button>
              <button className="btn--danger btn--sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn--danger-outline btn--full" onClick={handleDelete}>
            삭제하기
          </button>
        ))}

      </div>
    </div>
  )
}
