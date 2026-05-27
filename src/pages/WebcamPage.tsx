import { useRef, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera,
  faClipboardList,
  faClock,
  faPause,
  faPlay,
  faStop,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import {
  getPostureProfiles,
  updatePostureProfile,
  deletePostureProfile,
  saveWebcamSession,
  getAlertTypes,
  analyzeWebcam,
  type PostureProfile,
  type WebcamAnalyzeResponse,
} from '../services/webcamApi'
import { useStretchReminder, type StretchInterval } from '../hooks/useStretchReminder'
import { useWebcamAssistantComment } from '../hooks/useWebcamAssistantComment'
import { getWebcamSettings } from '../services/webcamSettingsApi'
import WebcamStream, { type WebcamStreamRef } from '../components/Webcam/WebcamStream'
import WebcamHistoryStats from '../components/Webcam/WebcamHistoryStats'
import WcamSessionSummaryChart from '../components/Webcam/WcamSessionSummaryChart'
import PostureProfileModal from '../components/Webcam/PostureProfileModal'
import PostureGuideModal from '../components/Webcam/PostureGuideModal'
import PageHeader from '../components/PageHeader'
import '../styles/features/webcam.scss'

type WcamPhase = 'ready' | 'analyzing' | 'summary'
type AnalysisState = 'active' | 'paused'

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

export default function WebcamPage() {
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<WcamPhase>('ready')
  const [analysisState, setAnalysisState] = useState<AnalysisState>('active')
  const [prevGoodRatio, setPrevGoodRatio] = useState<number | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<WebcamAnalyzeResponse | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<PostureProfile | null>(null)
  const [isProfileListOpen, setIsProfileListOpen] = useState(false)
  const [isStretchOpen, setIsStretchOpen] = useState(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined)

  const sessionRef = useRef({
    startedAt: null as string | null,
    // 상태 전환 횟수 (summary "X회" 표시용)
    goodTransitions: 0,
    warningTransitions: 0,
    badTransitions: 0,
    causeCounts: {} as Record<string, number>,
    // 프레임 수 (자세 점수 계산용)
    goodFrames: 0,
    warningFrames: 0,
    badFrames: 0,
    totalFrames: 0,
  })
  const prevStatusRef = useRef<string | null>(null)
  const prevIssuesRef = useRef<Set<string>>(new Set())
  const webcamStreamRef = useRef<WebcamStreamRef>(null)
  const requestInFlightRef = useRef(false)
  const analysisTimerRef = useRef<number>()
  const consecutiveErrorRef = useRef(0)

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

  const { data: webcamSettings } = useQuery({
    queryKey: ['webcam-settings'],
    queryFn: getWebcamSettings,
    staleTime: 5 * 60 * 1000,
  })

  const { mutate: doSaveSession } = useMutation({
    mutationFn: saveWebcamSession,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['webcam-history'] }) },
  })
  const { mutateAsync: runUpdate } = useMutation({
    mutationFn: ({ profileId, data }: { profileId: number; data: Parameters<typeof updatePostureProfile>[1] }) =>
      updatePostureProfile(profileId, data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['postureProfiles'], (old: PostureProfile[] = []) =>
        old.map((p) => (p.profile_id === updatedProfile.profile_id ? updatedProfile : p)),
      )
    },
  })
  const { mutateAsync: runDelete } = useMutation({
    mutationFn: (profileId: number) => deletePostureProfile(profileId),
    onSuccess: (_, profileId) => {
      queryClient.setQueryData(['postureProfiles'], (old: PostureProfile[] = []) =>
        old.filter((p) => p.profile_id !== profileId),
      )
      setSelectedProfile(null)
    },
  })
  const { mutateAsync: runAnalyze } = useMutation({
    mutationFn: (imageBase64: string) =>
      analyzeWebcam(imageBase64, undefined, webcamSettings?.posture_sensitivity ?? 'medium'),
    onSuccess: () => {
      setAnalyzeError(null)
      consecutiveErrorRef.current = 0
    },
    onError: (error) => {
      console.error('웹캠 분석 실패:', error)
      consecutiveErrorRef.current++
      if (consecutiveErrorRef.current >= 5) {
        setAnalyzeError('카메라가 감지되지 않습니다. 카메라 앞에 바르게 앉은 후 재개해주세요.')
        setAnalysisState('paused')
      }
    },
  })

  const stretchReminder = useStretchReminder()

  // analyzing 단계를 벗어나면 스트레칭 알림 자동 해제
  useEffect(() => {
    if (phase !== 'analyzing') {
      stretchReminder.disable()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 분석 일시정지 시 스트레칭 타이머도 일시정지
  useEffect(() => {
    if (phase !== 'analyzing') return
    if (analysisState === 'paused') {
      stretchReminder.pause()
    } else {
      stretchReminder.resume()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisState, phase])

  const {
    assistantComment,
    assistantError,
    isAssistantCommentPending,
    notifPermission,
    handleAnalyzeResult,
    resetAssistantComment,
  } = useWebcamAssistantComment(phase === 'analyzing', webcamSettings?.ai_comment_threshold_sec ?? 60)

  const isAnalyzing = phase === 'analyzing' && analysisState === 'active' && !webcamError
  const canAddMore = profiles.filter((p) => p.is_active).length < 3
  const profileEditable = phase !== 'analyzing' || analysisState === 'paused'

  const hasProfile = profiles.length > 0 && profiles.filter((p) => p.is_active).length > 0

  // ── 핸들러 ────────────────────────────────────────────────────────────────

  const handleStartAnalysis = () => {
    resetAssistantComment()
    setWebcamError(null)
    setAnalyzeError(null)
    consecutiveErrorRef.current = 0
    sessionRef.current = {
      startedAt: new Date().toISOString(),
      goodTransitions: 0,
      warningTransitions: 0,
      badTransitions: 0,
      causeCounts: {},
      goodFrames: 0,
      warningFrames: 0,
      badFrames: 0,
      totalFrames: 0,
    }
    prevStatusRef.current = null
    prevIssuesRef.current = new Set()
    setAnalyzeResult(null)
    setAnalysisState('active')
    setPhase('analyzing')
  }

  const handlePause = () => {
    resetAssistantComment()
    setAnalysisState('paused')
  }

  const handleResume = () => {
    setAnalyzeError(null)
    consecutiveErrorRef.current = 0
    setAnalysisState('active')
  }

  const handleStop = () => {
    const historyCache = queryClient.getQueryData<{ sessions: { good_ratio: number }[] }>(['webcam-history'])
    setPrevGoodRatio(historyCache?.sessions[0]?.good_ratio ?? null)

    const { startedAt, goodFrames, warningFrames, badFrames, totalFrames, causeCounts } = sessionRef.current
    if (startedAt && totalFrames > 0) {
      doSaveSession({
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        good_frames: goodFrames,
        warning_frames: warningFrames,
        bad_frames: badFrames,
        cause_counts: causeCounts,
      })
    }
    sessionRef.current.startedAt = null
    setPhase('summary')
  }

  const handleResult = (data: WebcamAnalyzeResponse) => {
    setAnalyzeResult(data)
    handleAnalyzeResult(data)

    sessionRef.current.totalFrames++
    if (data.status === 'good') sessionRef.current.goodFrames++
    else if (data.status === 'warning') sessionRef.current.warningFrames++
    else sessionRef.current.badFrames++

    if (data.status !== prevStatusRef.current) {
      const key = `${data.status}Transitions` as 'goodTransitions' | 'warningTransitions' | 'badTransitions'
      sessionRef.current[key]++
      prevStatusRef.current = data.status
    }
    const newIssues = new Set(data.issues ?? [])
    for (const id of newIssues) {
      if (!prevIssuesRef.current.has(id)) {
        sessionRef.current.causeCounts[id] = (sessionRef.current.causeCounts[id] ?? 0) + 1
      }
    }
    prevIssuesRef.current = newIssues
  }

  useEffect(() => {
    if (!isAnalyzing) return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      if (!requestInFlightRef.current) {
        const imageBase64 = webcamStreamRef.current?.captureFrame() ?? null
        if (imageBase64) {
          requestInFlightRef.current = true
          try {
            const data = await runAnalyze(imageBase64)
            handleResult(data)
          } catch {
            // onError에서 analyzeError 상태로 처리
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
  }, [isAnalyzing])

  // ── Ready phase ────────────────────────────────────────────────────────────

  const renderReadyHero = () => (
    <section className="wcam-hero-card">
      <div>
        <p className="wcam-hero-kicker">Webcam Analysis</p>
        <h2>실시간 웹캠으로 자세를 분석합니다</h2>
        <p>
          카메라 앞에 바르게 앉아 기준 자세를 등록하면, 실시간으로 자세 이탈을 감지하고
          거북목·굽은 어깨 등 문제를 즉시 알려드립니다.
        </p>
      </div>
      <div className="wcam-hero-action">
        <button
          className="btn--primary btn--lg"
          onClick={handleStartAnalysis}
          disabled={!hasProfile || profilesLoading}
        >
          분석 시작하기
        </button>
      </div>
    </section>
  )

  const renderReadyPhase = () => (
    <div className="wcam-ready-phase">
      <div className="card">
        <p className="wcam-kicker">기준 자세</p>
        {profilesLoading ? (
          <div className="wcam-profile-loading">
            <div className="wcam-profile-skeleton-header" />
            <div className="wcam-profile-scroll">
              <div className="wcam-profile-skeleton-item" />
              <div className="wcam-profile-skeleton-item" />
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="wcam-empty-state">
            <div className="wcam-empty-icon"><FontAwesomeIcon icon={faClipboardList} /></div>
            <h4>등록된 기준 자세가 없습니다</h4>
            <p>카메라 앞에 바르게 앉은 후 기준 자세를 등록하면 실시간 분석을 시작할 수 있습니다.</p>
            <button className="btn--primary btn--lg" onClick={() => setIsGuideOpen(true)}>
              <FontAwesomeIcon icon={faCamera} />
              기준 자세 등록하기
            </button>
          </div>
        ) : (
          <>
            <div className="wcam-profile-list-header">
              <h4>등록된 자세 ({profiles.length}개)</h4>
              <div className="wcam-info-badge">
                ?
                <div className="wcam-info-tooltip">활성 기준 자세는 최대 3개까지 등록할 수 있습니다.</div>
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
                onClick={() => setIsGuideOpen(true)}
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
      <WebcamHistoryStats />
    </div>
  )

  // ── Analyzing phase ────────────────────────────────────────────────────────

  const renderAnalyzingPhase = () => (
    <div className="wcam-analyzing-layout">
      <div className="wcam-analyzing-left">
        <div className="wcam-stage-card">
          <div className="wcam-stage-inner">
            <WebcamStream
              ref={webcamStreamRef}
              webcamNeeded={phase === 'analyzing'}
              deviceId={selectedDeviceId}
              landmarks={analyzeResult?.landmarks}
              frameWidth={analyzeResult?.frame_width}
              frameHeight={analyzeResult?.frame_height}
              statusColor={analyzeResult ? STATUS_COLOR[analyzeResult.status] : undefined}
              onCameraError={setWebcamError}
              onDevicesFound={(devices) => {
                // DEV: 카메라 선택 UI 테스트용 — 배포 전 제거
                if (import.meta.env.DEV && devices.length < 2) {
                  setCameraDevices([
                    ...devices,
                    { deviceId: 'mock-ir', label: 'IR Camera (테스트)', kind: 'videoinput', groupId: '' } as MediaDeviceInfo,
                  ])
                } else {
                  setCameraDevices(devices)
                }
              }}
            />
            {(webcamError || analyzeError) && (
              <div className="wcam-canvas-overlay">
                <div className="wcam-canvas-overlay__content">
                  <p className="wcam-canvas-overlay__msg">
                    {webcamError ?? analyzeError}
                  </p>
                  {analyzeError && !webcamError && (
                    <p className="wcam-canvas-overlay__hint">아래 재개 버튼을 눌러주세요</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="wcam-control-bar">
          <button
            className="btn-icon btn-icon--circle wcam-ctrl-icon"
            onClick={() => setIsProfileListOpen(true)}
            title="기준자세 조회"
          >
            <FontAwesomeIcon icon={faClipboardList} />
          </button>

          <div className="wcam-ctrl-stretch-wrap">
            <button
              className={`btn-icon btn-icon--circle wcam-ctrl-icon${stretchReminder.isEnabled ? ' wcam-ctrl-icon--active' : ''}`}
              onClick={() => setIsStretchOpen((v) => !v)}
              title="스트레칭 알림"
            >
              <FontAwesomeIcon icon={faClock} />
              {stretchReminder.isEnabled && (
                <span className="wcam-ctrl-stretch-badge">{formatTimeLeft(stretchReminder.timeLeft)}</span>
              )}
            </button>
            {isStretchOpen && (
              <div className="wcam-stretch-popover" role="dialog">
                <div className="wcam-stretch-popover__head">
                  <div
                    className={`wcam-stretch-popover__icon${stretchReminder.isEnabled ? ' wcam-stretch-popover__icon--active' : ''}`}
                    aria-hidden="true"
                  >
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <div className="wcam-stretch-popover__titles">
                    <strong>스트레칭 알림</strong>
                    <span>
                      {stretchReminder.isEnabled
                        ? '주기적으로 스트레칭을 안내해요'
                        : '알림이 꺼져 있어요'}
                    </span>
                  </div>
                  <label className="wcam-stretch-popover__switch" aria-label="스트레칭 알림 켜기/끄기">
                    <input
                      type="checkbox"
                      checked={stretchReminder.isEnabled}
                      onChange={() => stretchReminder.toggle()}
                    />
                    <span className="wcam-stretch-popover__switch-track" />
                  </label>
                </div>
                <fieldset
                  className="wcam-stretch-popover__intervals"
                  disabled={!stretchReminder.isEnabled}
                >
                  <legend>주기</legend>
                  <div className="wcam-stretch-popover__chip-row">
                    {([1, 30, 60, 120] as StretchInterval[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`wcam-stretch-chip${stretchReminder.intervalMinutes === m ? ' wcam-stretch-chip--active' : ''}`}
                        onClick={() => stretchReminder.setIntervalMinutes(m)}
                      >
                        {m < 60 ? `${m}분` : `${m / 60}시간`}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="wcam-stretch-popover__footer">
                  <button
                    type="button"
                    className="wcam-stretch-popover__done"
                    onClick={() => setIsStretchOpen(false)}
                  >
                    완료
                  </button>
                </div>
              </div>
            )}
          </div>

          {cameraDevices.length > 1 && (
            <select
              className="wcam-camera-select"
              value={selectedDeviceId ?? ''}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value || undefined)
                setWebcamError(null)
                setAnalyzeError(null)
              }}
              title="카메라 선택"
            >
              {cameraDevices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `카메라 ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <div className="wcam-ctrl-spacer" />

          {analysisState === 'active' ? (
            <button className="btn--secondary wcam-ctrl-action-btn" onClick={handlePause}>
              <FontAwesomeIcon icon={faPause} />
              일시정지
            </button>
          ) : (
            <button className="btn--primary wcam-ctrl-action-btn" onClick={handleResume} disabled={!hasProfile || !!webcamError}>
              <FontAwesomeIcon icon={faPlay} />
              재개
            </button>
          )}
          <button className="btn--danger-outline wcam-ctrl-action-btn" onClick={handleStop}>
            <FontAwesomeIcon icon={faStop} />
            중지
          </button>
        </div>

        {analysisState === 'paused' && (
          <div className="wcam-paused-banner">
            {hasProfile
              ? '⏸ 일시정지 중 — 기준자세 수정/삭제가 가능합니다'
              : '⏸ 활성화된 기준 자세가 없습니다 — 기준 자세를 활성화한 뒤 재개해주세요'}
          </div>
        )}
      </div>

      <div className="wcam-analyzing-right">
        {analyzeResult ? (
          <div className="card wcam-result-card">
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
            <div className="wcam-chat-area">
              {isAssistantCommentPending && !assistantComment ? (
                <div className="wcam-chat-bubble wcam-chat-bubble--typing">
                  <span /><span /><span />
                </div>
              ) : assistantComment ? (
                <div className="wcam-chat-bubble">{assistantComment}</div>
              ) : assistantError ? (
                <p className="wcam-comment-error">{assistantError}</p>
              ) : (
                <p className="wcam-comment-muted">자세 이상이 지속되면 AI 코멘트가 표시됩니다.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="card wcam-result-placeholder">
            <p className="wcam-comment-muted">
              {webcamError || analyzeError ? '분석 대기 중...' : '카메라 연결 중...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // ── Summary phase ──────────────────────────────────────────────────────────

  const renderSummaryPhase = () => {
    const { goodTransitions, warningTransitions, badTransitions, causeCounts, goodFrames, warningFrames, totalFrames } = sessionRef.current
    return (
      <div className="wcam-summary-phase">
        <WcamSessionSummaryChart
          goodCount={goodTransitions}
          warningCount={warningTransitions}
          badCount={badTransitions}
          causeCounts={causeCounts}
          alertMap={alertMap}
          prevGoodRatio={prevGoodRatio}
          assistantComment={assistantComment}
          goodFrames={goodFrames}
          warningFrames={warningFrames}
          totalFrames={totalFrames}
          onRestart={() => { setPhase('ready'); setAnalyzeResult(null) }}
        />
        <WebcamHistoryStats />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader />
      <main>
        {phase === 'ready' && renderReadyHero()}
        <div className="page-content">
          {notifPermission === 'denied' && (
            <div className="wcam-notif-banner">
              알림이 차단되어 있어요. 주소창 자물쇠 아이콘 → 알림 → <strong>허용</strong> 후 새로고침하면 자세 경고를 받을 수 있습니다.
            </div>
          )}
          {phase === 'ready'    && renderReadyPhase()}
          {phase === 'analyzing' && renderAnalyzingPhase()}
          {phase === 'summary'  && renderSummaryPhase()}
        </div>
      </main>

      {/* 기준자세 목록 모달 (analyzing 중 📋 클릭) */}
      {isProfileListOpen && (
        <div className="wcam-modal-overlay" onClick={() => setIsProfileListOpen(false)}>
          <div className="wcam-profile-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wcam-modal-header">
              <h3>기준 자세</h3>
              {!profileEditable && (
                <span className="wcam-profile-list-notice">분석 중지 또는 일시정지 후 수정 가능합니다</span>
              )}
              <button className="btn-icon btn-icon--circle" onClick={() => setIsProfileListOpen(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="wcam-profile-scroll">
              {profiles.map((profile) => (
                <div
                  key={profile.profile_id}
                  className={`wcam-profile-item${profile.is_active ? ' active' : ''}`}
                  onClick={() => { setSelectedProfile(profile); setIsProfileListOpen(false) }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="wcam-profile-name">{profile.profile_name}</span>
                  <span className="wcam-profile-date">{formatDate(profile.created_at)}</span>
                  {profile.is_active && <span className="wcam-profile-badge">사용 중</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 기준자세 추가 가이드 (ready phase 에서 + 클릭) */}
      {isGuideOpen && (
        <PostureGuideModal
          onClose={() => setIsGuideOpen(false)}
          onComplete={() => setIsGuideOpen(false)}
        />
      )}

      {/* 기준자세 상세/편집 */}
      {selectedProfile && (
        <PostureProfileModal
          profile={selectedProfile}
          editable={profileEditable}
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
