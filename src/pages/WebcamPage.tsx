import { useRef, useState } from 'react'
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
  type PostureProfile,
} from '../services/webcamApi'
import { usePostureNotification } from '../hooks/usePostureNotification'
import { useStretchReminder, type StretchInterval } from '../hooks/useStretchReminder'
import { useWebcamAssistantComment, type WebcamAssistantAnalyzeInput } from '../hooks/useWebcamAssistantComment'
import WebcamStream, { type WebcamAnalysisResult } from '../components/Webcam/WebcamStream'
import WebcamHistoryStats from '../components/Webcam/WebcamHistoryStats'
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
  const [analyzeResult, setAnalyzeResult] = useState<WebcamAnalysisResult | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<PostureProfile | null>(null)
  const [isProfileListOpen, setIsProfileListOpen] = useState(false)
  const [isStretchOpen, setIsStretchOpen] = useState(false)

  const sessionRef = useRef({
    startedAt: null as string | null,
    goodCount: 0,
    warningCount: 0,
    badCount: 0,
    causeCounts: {} as Record<string, number>,
  })
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

  const { notify, permission: notifPermission } = usePostureNotification()
  const stretchReminder = useStretchReminder()
  const {
    assistantComment,
    assistantError,
    isAssistantCommentPending,
    handleAnalyzeResult,
    resetAssistantComment,
  } = useWebcamAssistantComment(phase === 'analyzing')

  const isAnalyzing = phase === 'analyzing' && analysisState === 'active'
  const canAddMore = profiles.filter((p) => p.is_active).length < 3
  const profileEditable = phase !== 'analyzing' || analysisState === 'paused'

  const hasProfile = profiles.length > 0

  // ── 핸들러 ────────────────────────────────────────────────────────────────

  const handleStartAnalysis = () => {
    resetAssistantComment()
    sessionRef.current = {
      startedAt: new Date().toISOString(),
      goodCount: 0,
      warningCount: 0,
      badCount: 0,
      causeCounts: {},
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

  const handleResume = () => setAnalysisState('active')

  const handleStop = () => {
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
    setPhase('summary')
  }

  const handleResult = (data: WebcamAnalysisResult) => {
    setAnalyzeResult(data)
    handleAnalyzeResult(data as WebcamAssistantAnalyzeInput)
    notify(data.status as 'good' | 'warning' | 'bad', data.issues ?? [])

    if (data.status !== prevStatusRef.current) {
      const key = `${data.status}Count` as 'goodCount' | 'warningCount' | 'badCount'
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

  // ── Ready phase ────────────────────────────────────────────────────────────

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
        ) : !hasProfile ? (
          <div className="wcam-empty-state">
            <div className="wcam-empty-icon"><FontAwesomeIcon icon={faClipboardList} /></div>
            <h4>등록된 기준 자세가 없습니다</h4>
            <p>카메라 앞에 바르게 앉은 후 기준 자세를 등록하면 실시간 분석을 시작할 수 있습니다.</p>
            <button className="btn--primary btn--lg btn--full" onClick={() => setIsGuideOpen(true)}>
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
      <button
        className="btn--primary btn--lg btn--full"
        onClick={handleStartAnalysis}
        disabled={!hasProfile}
      >
        <FontAwesomeIcon icon={faPlay} />
        분석 시작
      </button>
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
              isAnalyzing={isAnalyzing}
              webcamNeeded={phase === 'analyzing'}
              onResult={handleResult}
            />
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
              <div className="wcam-stretch-popover">
                <span className="wcam-stretch-label">스트레칭 알림</span>
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
                  onClick={() => { stretchReminder.toggle(); setIsStretchOpen(false) }}
                >
                  {stretchReminder.isEnabled ? '끄기' : '켜기'}
                </button>
              </div>
            )}
          </div>

          <div className="wcam-ctrl-spacer" />

          {analysisState === 'active' ? (
            <button className="btn--secondary wcam-ctrl-action-btn" onClick={handlePause}>
              <FontAwesomeIcon icon={faPause} />
              일시정지
            </button>
          ) : (
            <button className="btn--primary wcam-ctrl-action-btn" onClick={handleResume}>
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
            ⏸ 일시정지 중 — 기준자세 수정/삭제가 가능합니다
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
            <p className="wcam-comment-muted">분석이 시작되면 결과가 여기 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )

  // ── Summary phase ──────────────────────────────────────────────────────────

  const renderSummaryPhase = () => {
    const { goodCount, warningCount, badCount, causeCounts } = sessionRef.current
    const total = goodCount + warningCount + badCount
    return (
      <div className="wcam-summary-phase">
        <div className="card">
          <h3>세션 요약</h3>
          {total > 0 ? (
            <>
              <div className="wcam-summary-stats">
                <div className="wcam-summary-stat wcam-summary-stat--good">
                  <span className="wcam-summary-stat__label">좋은 자세</span>
                  <span className="wcam-summary-stat__value">{goodCount}회</span>
                </div>
                <div className="wcam-summary-stat wcam-summary-stat--warning">
                  <span className="wcam-summary-stat__label">자세 주의</span>
                  <span className="wcam-summary-stat__value">{warningCount}회</span>
                </div>
                <div className="wcam-summary-stat wcam-summary-stat--bad">
                  <span className="wcam-summary-stat__label">자세 불량</span>
                  <span className="wcam-summary-stat__value">{badCount}회</span>
                </div>
              </div>
              {Object.keys(causeCounts).length > 0 && (
                <div className="wcam-issue-block">
                  <h4>자주 발생한 문제</h4>
                  <ul>
                    {Object.entries(causeCounts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([typeId, count]) => (
                        <li key={typeId}>{alertMap[typeId]?.alert_name ?? typeId} ({count}회)</li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="wcam-comment-muted">분석 데이터가 없습니다.</p>
          )}
          {assistantComment && (
            <div className="wcam-chat-area" style={{ marginTop: '1rem' }}>
              <p className="wcam-kicker" style={{ marginBottom: '0.5rem' }}>마지막 AI 코멘트</p>
              <div className="wcam-chat-bubble">{assistantComment}</div>
            </div>
          )}
        </div>
        <div className="wcam-summary-actions">
          <button
            className="btn--secondary btn--lg"
            onClick={() => { setPhase('ready'); setAnalyzeResult(null) }}
          >
            재시작
          </button>
        </div>
        <WebcamHistoryStats />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader />
      <main className="page-content">
        {notifPermission === 'denied' && (
          <div className="wcam-notif-banner">
            알림이 차단되어 있어요. 주소창 자물쇠 아이콘 → 알림 → <strong>허용</strong> 후 새로고침하면 자세 경고를 받을 수 있습니다.
          </div>
        )}
        {phase === 'ready'    && renderReadyPhase()}
        {phase === 'analyzing' && renderAnalyzingPhase()}
        {phase === 'summary'  && renderSummaryPhase()}
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
