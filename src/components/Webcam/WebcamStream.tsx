import { useRef, useEffect, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faClipboardList, faClock, faPause, faPlay, faPlus } from '@fortawesome/free-solid-svg-icons'
import {
  analyzeWebcam,
  getPostureProfiles,
  updatePostureProfile,
  deletePostureProfile,
  saveWebcamSession,
  getAlertTypes,
  type PostureProfile,
} from '../../services/webcamApi'
import { drawSkeleton } from '../../utils/skeleton'
import { usePostureNotification } from '../../hooks/usePostureNotification'
import { useStretchReminder, type StretchInterval } from '../../hooks/useStretchReminder'
import { useWebcamAssistantComment, type WebcamAssistantAnalyzeInput } from '../../hooks/useWebcamAssistantComment'
import PostureProfileModal from './PostureProfileModal'
import PostureGuideModal from './PostureGuideModal'
import '../../styles/features/webcam.scss'

interface WebcamStreamProps {
  isActive: boolean
  onToggle: () => void
}

const STATUS_LABEL: Record<string, string> = {
  good: '좋은 자세',
  warning: '자세 주의',
  bad: '자세 불량',
}

const STATUS_COLOR: Record<string, string> = {
  good: '#10b981',
  warning: '#f59e0b',
  bad: '#ef4444',
}


function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function WebcamStream({ isActive, onToggle }: WebcamStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [analyzeResult, setAnalyzeResult] = useState<{
    status: string
    deviation_score: number
    profile_name: string
    issues: string[]
  } | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<PostureProfile | null>(null)
  const analysisTimerRef = useRef<number>()
  const requestInFlightRef = useRef(false)
  const queryClient = useQueryClient()
  const { notify, permission: notifPermission } = usePostureNotification()
  const stretchReminder = useStretchReminder()
  const {
    assistantComment,
    assistantError,
    isAssistantCommentPending,
    handleAnalyzeResult,
    resetAssistantComment,
  } = useWebcamAssistantComment(isActive)

  // 세션 누적 카운트 (state 대신 ref → 매 프레임 리렌더 방지)
  const sessionRef = useRef({
    startedAt: null as string | null,
    goodCount: 0,
    warningCount: 0,
    badCount: 0,
    causeCounts: {} as Record<string, number>,
  })
  // 중복 카운트 방지용 이전 프레임 상태
  const prevStatusRef = useRef<string | null>(null)
  const prevIssuesRef = useRef<Set<string>>(new Set())

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['postureProfiles'],
    queryFn: getPostureProfiles,
    staleTime: 1000 * 60,
  })
  const { data: alertTypes = [] } = useQuery({
    queryKey: ['alertTypes'],
    queryFn: getAlertTypes,
    staleTime: Infinity,
  })
  const alertMap = Object.fromEntries(alertTypes.map((a) => [a.alert_type_id, a]))

  const { mutate: doSaveSession } = useMutation({ mutationFn: saveWebcamSession })

  const hasProfile = profiles.length > 0
  const activeCount = profiles.filter((p) => p.is_active).length
  const canAddMore = activeCount < 3

  const webcamNeeded = isActive || isGuideOpen

  useEffect(() => {
    if (!webcamNeeded) return

    let stopped = false
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!stopped && videoRef.current) videoRef.current.srcObject = stream
        else stream.getTracks().forEach((t) => t.stop())
      } catch (error) {
        console.error('웹캠 접근 실패:', error)
      }
    }
    startWebcam()
    return () => {
      stopped = true
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [webcamNeeded])

  const captureFrame = useCallback((captureWidth = 480, captureHeight = 360): string | null => {
    const canvas = captureCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video || video.readyState < 2 || !video.videoWidth) return null

    canvas.width = captureWidth
    canvas.height = captureHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, captureWidth, captureHeight)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    if (!dataUrl || dataUrl === 'data:,') return null
    return dataUrl.split(',')[1]
  }, [])

  const openGuide = useCallback(() => setIsGuideOpen(true), [])

  const { mutateAsync: runUpdate } = useMutation({
    mutationFn: ({ profileId, data }: { profileId: number; data: Parameters<typeof updatePostureProfile>[1] }) =>
      updatePostureProfile(profileId, data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['postureProfiles'], (old: PostureProfile[] = []) =>
        old.map((p) => (p.profile_id === updatedProfile.profile_id ? updatedProfile : p))
      )
    },
  })

  const { mutateAsync: runDelete } = useMutation({
    mutationFn: (profileId: number) => deletePostureProfile(profileId),
    onSuccess: (_, profileId) => {
      queryClient.setQueryData(['postureProfiles'], (old: PostureProfile[] = []) =>
        old.filter((p) => p.profile_id !== profileId)
      )
      setSelectedProfile(null)
    },
  })

  const { mutateAsync: runAnalyze } = useMutation({
    mutationFn: (imageBase64: string) => analyzeWebcam(imageBase64),
    onSuccess: (data) => {
      setAnalyzeResult({
        status: data.status,
        deviation_score: data.deviation_score,
        profile_name: data.profile_name,
        issues: data.issues,
      })
      handleAnalyzeResult(data as WebcamAssistantAnalyzeInput)
      notify(data.status, data.issues)
      if (displayCanvasRef.current && data.landmarks?.length) {
        drawSkeleton(
          displayCanvasRef.current,
          data.landmarks,
          data.frame_width,
          data.frame_height,
          STATUS_COLOR[data.status],
        )
      }

      // 상태가 바뀔 때만 카운트 (3초 유지해도 1회만)
      if (data.status !== prevStatusRef.current) {
        const key = `${data.status}Count` as 'goodCount' | 'warningCount' | 'badCount'
        sessionRef.current[key]++
        prevStatusRef.current = data.status
      }

      // 이전 프레임에 없던 issue만 카운트
      const newIssues = new Set(data.issues)
      for (const id of newIssues) {
        if (!prevIssuesRef.current.has(id)) {
          sessionRef.current.causeCounts[id] = (sessionRef.current.causeCounts[id] ?? 0) + 1
        }
      }
      prevIssuesRef.current = newIssues
    },
    onError: (error) => {
      const axiosError = error as AxiosError
      console.error('웹캠 분석 실패:', axiosError.response?.data ?? error)
    },
  })

  useEffect(() => {
    if (!isActive || !hasProfile) return

    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      if (!requestInFlightRef.current) {
        const imageBase64 = captureFrame()
        if (imageBase64) {
          requestInFlightRef.current = true
          try {
            await runAnalyze(imageBase64)
          } finally {
            requestInFlightRef.current = false
          }
        }
      }
      if (!cancelled) analysisTimerRef.current = window.setTimeout(tick, 300)
    }

    analysisTimerRef.current = window.setTimeout(tick, 0)
    return () => {
      cancelled = true
      requestInFlightRef.current = false
      clearTimeout(analysisTimerRef.current)
    }
  }, [isActive, hasProfile, captureFrame, runAnalyze])

  // 세션 시작 → ref 초기화 / 세션 종료 → DB 저장
  useEffect(() => {
    if (isActive) {
      sessionRef.current = {
        startedAt: new Date().toISOString(),
        goodCount: 0,
        warningCount: 0,
        badCount: 0,
        causeCounts: {},
      }
      prevStatusRef.current = null
      prevIssuesRef.current = new Set()
      resetAssistantComment()
    } else {
      const { startedAt, goodCount, warningCount, badCount, causeCounts } = sessionRef.current
      const total = goodCount + warningCount + badCount
      if (startedAt && total > 0) {
        doSaveSession({
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          good_count: goodCount,
          warning_count: warningCount,
          bad_count: badCount,
          cause_counts: causeCounts,
        })
      }
      sessionRef.current.startedAt = null
    }
  }, [isActive, doSaveSession, resetAssistantComment])

  return (
    <>
    <div className="webcam-page">
      {notifPermission === 'denied' && (
        <div className="wcam-notif-banner">
          알림이 차단되어 있어요. 주소창 자물쇠 아이콘 → 알림 → <strong>허용</strong> 후 새로고침하면 백그라운드 자세 경고를 받을 수 있습니다.
        </div>
      )}
      {/* hidden elements */}
      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {/* ── 왼쪽: 캔버스 + 분석 결과 ── */}
      <div className="webcam-left">
        <div className="wcam-stage-card">
          <div className="wcam-stage-inner">
            <canvas ref={displayCanvasRef} className="webcam-canvas" />
          </div>
        </div>

        {analyzeResult && (
          <div className="card">
            <div className="wcam-result-header">
              <h3>분석 결과</h3>
              <span className={`wcam-status-chip ${analyzeResult.status}`}>
                {STATUS_LABEL[analyzeResult.status]}
              </span>
            </div>
            <p className="wcam-result-score">
              이탈 점수&nbsp;<strong>{(analyzeResult.deviation_score * 100).toFixed(1)}</strong>
              &nbsp;·&nbsp;기준: {analyzeResult.profile_name}
            </p>
            {analyzeResult.issues.length > 0 && (
              <div className="wcam-issue-block">
                <h4>개선 필요 항목</h4>
                <ul>
                  {analyzeResult.issues.map((typeId) => (
                    <li key={typeId}>{alertMap[typeId]?.alert_name ?? typeId}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="wcam-comment-block">
              <h4>AI 코멘트</h4>
              {isAssistantCommentPending && !assistantComment ? (
                <p className="wcam-comment-muted">코멘트를 생성하는 중입니다...</p>
              ) : assistantError ? (
                <p className="wcam-comment-error">{assistantError}</p>
              ) : assistantComment ? (
                <p>{assistantComment}</p>
              ) : (
                <p className="wcam-comment-muted">판정이 바뀌면 새 코멘트를 표시합니다.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 오른쪽: 기준 자세 + 분석 버튼 ── */}
      <div className="webcam-right">
        <div className="card">
          <p className="wcam-kicker">기준 자세</p>

          {profilesLoading ? (
            /* 로딩 중 스켈레톤 */
            <div className="wcam-profile-loading">
              <div className="wcam-profile-skeleton-header" />
              <div className="wcam-profile-scroll">
                <div className="wcam-profile-skeleton-item" />
                <div className="wcam-profile-skeleton-item" />
              </div>
            </div>
          ) : !hasProfile ? (
            /* 기준 자세 없음 — 빈 상태 */
            <div className="wcam-empty-state">
              <div className="wcam-empty-icon"><FontAwesomeIcon icon={faClipboardList} /></div>
              <h4>등록된 기준 자세가 없습니다</h4>
              <p>카메라 앞에 바르게 앉은 후 기준 자세를 등록하면 실시간 분석을 시작할 수 있습니다.</p>
              <button
                className="btn--primary btn--lg btn--full"
                onClick={openGuide}
              >
                <FontAwesomeIcon icon={faCamera} />
                기준 자세 등록하기
              </button>
            </div>
          ) : (
            /* 기준 자세 있음 — 카드 목록 */
            <>
              <div className="wcam-profile-list-header">
                <h4>등록된 자세 ({profiles.length}개)</h4>
                <div className="wcam-info-badge">
                  ?
                  <div className="wcam-info-tooltip">
                    활성 기준 자세는 최대 3개까지 등록할 수 있습니다.<br />
                    추가 등록하려면 기존 자세의 &apos;분석에 사용 여부&apos;를 해제해 주세요.
                  </div>
                </div>
              </div>
              <div className="wcam-profile-scroll">
                {profiles.map((profile) => (
                  <div
                    key={profile.profile_id}
                    className={`wcam-profile-item${profile.is_active ? ' active' : ''}`}
                    onClick={() => setSelectedProfile(profile)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="wcam-profile-name">{profile.profile_name}</span>
                    <span className="wcam-profile-date">{formatDate(profile.created_at)}</span>
                    {profile.is_active && <span className="wcam-profile-badge">사용 중</span>}
                  </div>
                ))}
                <button
                  className="btn--ghost btn--full wcam-add-btn"
                  onClick={openGuide}
                  disabled={!canAddMore}
                  title={!canAddMore ? '활성 기준 자세는 최대 3개까지 등록할 수 있습니다' : undefined}
                >
                  <span className="wcam-add-btn-icon"><FontAwesomeIcon icon={faPlus} /></span>
                  <span>{canAddMore ? '추가' : '최대 3개'}</span>
                </button>
              </div>
            </>
          )}

        </div>

        {hasProfile && (
          <button
            onClick={onToggle}
            className={isActive ? 'btn--danger-outline btn--lg btn--full' : 'btn--primary btn--lg btn--full'}
          >
            <FontAwesomeIcon icon={isActive ? faPause : faPlay} />
            {isActive ? '분석 중지' : '분석 시작'}
          </button>
        )}

        {/* ── 스트레칭 알림 ── */}
        <div className="card wcam-stretch-bar">
          <div className="wcam-stretch-inner">
            <FontAwesomeIcon icon={faClock} className="wcam-stretch-icon" />
            <div className="wcam-stretch-info">
              <span className="wcam-stretch-label">스트레칭 알림</span>
              {stretchReminder.isEnabled && (
                <span className="wcam-stretch-countdown">
                  {formatTimeLeft(stretchReminder.timeLeft)}
                </span>
              )}
            </div>
            <div className="wcam-stretch-controls">
              {!stretchReminder.isEnabled && (
                <select
                  className="wcam-stretch-select"
                  value={stretchReminder.intervalMinutes}
                  onChange={(e) =>
                    stretchReminder.setIntervalMinutes(Number(e.target.value) as StretchInterval)
                  }
                >
                  <option value={1}>1분</option>
                  <option value={30}>30분</option>
                  <option value={60}>1시간</option>
                  <option value={120}>2시간</option>
                </select>
              )}
              <button
                className={`wcam-stretch-btn ${stretchReminder.isEnabled ? 'on' : 'off'}`}
                onClick={stretchReminder.toggle}
              >
                {stretchReminder.isEnabled ? '끄기' : '켜기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {isGuideOpen && (
      <PostureGuideModal
        videoRef={videoRef}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => setIsGuideOpen(false)}
      />
    )}

    {selectedProfile && (
      <PostureProfileModal
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onUpdate={async (data) => {
          const updated = await runUpdate({ profileId: selectedProfile.profile_id, data })
          setSelectedProfile(updated)
        }}
        onDelete={async () => {
          await runDelete(selectedProfile.profile_id)
        }}
      />
    )}
    </>
  )
}
