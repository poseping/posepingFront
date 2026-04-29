import { useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser,
  faPen,
  faCheck,
  faXmark,
  faRightFromBracket,
  faTrash,
  faChair,
  faDumbbell,
  faHeartPulse,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import { logout, loginSuccess } from '../store/authSlice'
import { clearAuth, saveUserInfo } from '../services/authService'
import { updateNickname, deleteAccount, getLifestyleHabits } from '../services/memberApi'
import { getWebcamHistoryByPeriod, type HistoryPeriod } from '../services/webcamApi'
import { getPhotoAnalysisHistory } from '../services/photoAnalysisApi'
import type { RootState } from '../store/store'
import '../styles/my-page.scss'

type Period = HistoryPeriod

const PERIOD_LABELS: Record<Period, string> = { day: '오늘', week: '이번 주', month: '이번 달' }

const CAUSE_LABELS: Record<string, string> = {
  NECK_FORWARD:   '거북목',
  HEAD_TILT:      '머리 기울어짐',
  SHOULDER_SLOPE: '어깨 기울기',
  HIP_DEVIATION:  '골반 틀어짐',
  BAD_POSTURE:    '나쁜 자세',
}

export default function MyPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const token = useSelector((state: RootState) => state.auth.token) ?? ''

  const [period, setPeriod] = useState<Period>('week')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(user?.nickname ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: habitData, isLoading: habitLoading } = useQuery({
    queryKey: ['lifestyle-habit'],
    queryFn: getLifestyleHabits,
    staleTime: 5 * 60 * 1000,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['webcam-history-mypage', period],
    queryFn: () => getWebcamHistoryByPeriod(period),
    staleTime: 5 * 60 * 1000,
  })

  const sessions = historyData?.sessions ?? []

  const stats = useMemo(() => {
    if (!sessions.length) return null
    const good    = sessions.reduce((s, x) => s + x.good_count, 0)
    const warning = sessions.reduce((s, x) => s + x.warning_count, 0)
    const bad     = sessions.reduce((s, x) => s + x.bad_count, 0)
    const total   = good + warning + bad
    const avgScore = total ? Math.round(good / total * 100) : 0
    const causeSums: Record<string, number> = {}
    sessions.forEach(s => {
      if (!s.cause_counts) return
      Object.entries(s.cause_counts).forEach(([k, v]) => {
        causeSums[k] = (causeSums[k] ?? 0) + v
      })
    })
    return { sessionCount: sessions.length, total, good, warning, bad, avgScore, causeSums }
  }, [sessions])

  const { data: photoData, isLoading: photoLoading } = useQuery({
    queryKey: ['photo-analysis-history-mypage'],
    queryFn: getPhotoAnalysisHistory,
    staleTime: 5 * 60 * 1000,
  })

  const photoStats = useMemo(() => {
    const analyses = photoData ?? []
    if (!analyses.length) return null
    const good    = analyses.filter(a => a.status === 'good').length
    const warning = analyses.filter(a => a.status === 'warning').length
    const bad     = analyses.filter(a => a.status === 'bad').length
    const withNeck = analyses.filter(a => a.side?.forward_head_detected != null)
    const neckRate = withNeck.length
      ? Math.round(withNeck.filter(a => a.side?.forward_head_detected).length / withNeck.length * 100)
      : null
    const dates = analyses
      .map(a => a.analyzed_at ?? a.created_at ?? '')
      .filter(Boolean)
      .sort()
    const lastDate = dates.length ? dates[dates.length - 1] : null
    return { total: analyses.length, loaded: analyses.length, good, warning, bad, neckRate, lastDate }
  }, [photoData])

  const nicknameMutation = useMutation({
    mutationFn: (nickname: string) => updateNickname(nickname),
    onSuccess: (updatedUser) => {
      saveUserInfo(updatedUser)
      dispatch(loginSuccess({ user: updatedUser, token }))
      setEditingNickname(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      dispatch(logout())
      clearAuth()
      navigate('/login')
    },
  })

  const handleLogout = () => {
    dispatch(logout())
    clearAuth()
    navigate('/login')
  }

  const handleNicknameSave = () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) return
    if (trimmed === user?.nickname) { setEditingNickname(false); return }
    nicknameMutation.mutate(trimmed)
  }

  const handleNicknameCancel = () => {
    setEditingNickname(false)
    setNicknameInput(user?.nickname ?? '')
  }

  const providerLabel =
    user?.provider === 'KAKAO' ? '카카오 로그인' :
    user?.provider === 'GOOGLE' ? '구글 로그인' :
    user?.provider ?? ''

  const scoreClass =
    !stats ? '' :
    stats.avgScore >= 80 ? 'good' :
    stats.avgScore >= 50 ? 'warning' : 'bad'

  return (
    <>
      <PageHeader title="마이페이지" description="내 프로필과 활동 기록을 확인하세요" />
      <main className="page-content">

        {/* ── 회원 정보 카드 ── */}
        <section className="card">
          <p className="mp-kicker">My Profile</p>
          <div className="mp-profile-body">
            <div className="mp-avatar">
              {user?.profile_image_url
                ? <img src={user.profile_image_url} alt="프로필" className="mp-avatar-img" />
                : <FontAwesomeIcon icon={faUser} className="mp-avatar-icon" />
              }
            </div>
            <div className="mp-profile-info">
              {editingNickname ? (
                <div className="mp-nickname-edit">
                  <input
                    className="mp-nickname-input"
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    maxLength={20}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleNicknameSave()
                      if (e.key === 'Escape') handleNicknameCancel()
                    }}
                  />
                  <button
                    className="mp-icon-btn"
                    onClick={handleNicknameSave}
                    disabled={nicknameMutation.isPending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button className="mp-icon-btn" onClick={handleNicknameCancel}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div className="mp-nickname-row">
                  <h2 className="mp-nickname">{user?.nickname ?? '사용자'}</h2>
                  <button
                    className="mp-icon-btn"
                    onClick={() => {
                      setNicknameInput(user?.nickname ?? '')
                      setEditingNickname(true)
                    }}
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                </div>
              )}
              <span className="mp-provider-badge">{providerLabel}</span>
              {nicknameMutation.isError && (
                <p className="mp-error">닉네임 변경에 실패했습니다.</p>
              )}
            </div>
          </div>

          <div className="mp-profile-actions">
            <button className="mp-action-btn mp-logout-btn" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              로그아웃
            </button>
            <button
              className="mp-action-btn mp-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FontAwesomeIcon icon={faTrash} />
              회원 탈퇴
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="mp-delete-confirm">
              <p>정말로 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.</p>
              <div className="mp-confirm-row">
                <button
                  className="mp-action-btn mp-cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </button>
                <button
                  className="mp-action-btn mp-delete-confirm-btn"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  탈퇴하기
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── 생활 습관 ── */}
        <section className="card">
          <p className="mp-kicker">My Habits</p>
          <h3 className="mp-stats-title" style={{ marginBottom: '1.25rem' }}>생활 습관 정보</h3>

          {habitLoading && <div className="mp-stats-empty">불러오는 중...</div>}

          {!habitLoading && !habitData && (
            <>
              <div className="mp-stats-empty">아직 생활 습관 정보가 없어요.</div>
              <div className="mp-habit-footer">
                <button className="mp-habit-cta" onClick={() => navigate('/assistant')}>
                  분석 시작하기 <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </>
          )}

          {!habitLoading && habitData && (
            <>
              <div className="mp-habit-list">
                <div className="mp-habit-row">
                  <div className="mp-habit-icon"><FontAwesomeIcon icon={faChair} /></div>
                  <span className="mp-habit-label">하루 앉는 시간</span>
                  <span className="mp-habit-value">{habitData.sitting_hours_per_day ?? '-'}</span>
                </div>
                <div className="mp-habit-row">
                  <div className="mp-habit-icon"><FontAwesomeIcon icon={faDumbbell} /></div>
                  <span className="mp-habit-label">주간 운동 횟수</span>
                  <span className="mp-habit-value">{habitData.exercise_days_per_week ?? '-'}</span>
                </div>
                <div className="mp-habit-row">
                  <div className="mp-habit-icon"><FontAwesomeIcon icon={faHeartPulse} /></div>
                  <span className="mp-habit-label">불편한 부위</span>
                  <span className="mp-habit-value">{habitData.pain_areas ?? '-'}</span>
                </div>
              </div>
              <div className="mp-habit-footer">
                <button className="mp-habit-cta" onClick={() => navigate('/onboarding')}>
                  다시 답변하기 <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── 기간별 자세 통계 ── */}
        <section className="card">
          <div className="mp-stats-header">
            <div>
              <p className="mp-kicker">My Stats</p>
              <h3 className="mp-stats-title">자세 통계</h3>
            </div>
            <div className="mp-period-tabs">
              {(['day', 'week', 'month'] as Period[]).map(p => (
                <button
                  key={p}
                  className={`mp-period-tab${period === p ? ' active' : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {historyLoading && (
            <div className="mp-stats-empty">불러오는 중...</div>
          )}

          {!historyLoading && !stats && (
            <div className="mp-stats-empty">
              {PERIOD_LABELS[period]} 분석 기록이 없습니다.
            </div>
          )}

          {!historyLoading && stats && (
            <>
              <div className="mp-metrics">
                <div className="mp-metric">
                  <span>세션</span>
                  <strong>{stats.sessionCount}회</strong>
                </div>
                <div className="mp-metric">
                  <span>분석 프레임</span>
                  <strong>{stats.total.toLocaleString()}회</strong>
                </div>
                <div className="mp-metric">
                  <span>평균 자세 점수</span>
                  <strong className={`mp-score ${scoreClass}`}>{stats.avgScore}%</strong>
                </div>
              </div>

              {stats.total > 0 && (
                <div className="mp-bar-section">
                  <p className="mp-bar-label">자세 분포</p>
                  <div className="mp-stacked-bar">
                    <div className="mp-bar-good"    style={{ width: `${stats.good / stats.total * 100}%` }} />
                    <div className="mp-bar-warning"  style={{ width: `${stats.warning / stats.total * 100}%` }} />
                    <div className="mp-bar-bad"      style={{ width: `${stats.bad / stats.total * 100}%` }} />
                  </div>
                  <div className="mp-bar-legend">
                    <span className="mp-legend-item good">
                      좋음 {Math.round(stats.good / stats.total * 100)}%
                    </span>
                    <span className="mp-legend-item warning">
                      경고 {Math.round(stats.warning / stats.total * 100)}%
                    </span>
                    <span className="mp-legend-item bad">
                      나쁨 {Math.round(stats.bad / stats.total * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {Object.keys(stats.causeSums).length > 0 && (
                <div className="mp-causes">
                  <p className="mp-bar-label">주요 원인</p>
                  <div className="mp-cause-list">
                    {Object.entries(stats.causeSums)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, count]) => (
                        <span key={key} className="mp-cause-chip">
                          {CAUSE_LABELS[key] ?? key}
                          <strong>{count}회</strong>
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── 사진 분석 현황 ── */}
        <section className="card">
          <p className="mp-kicker">Photo Analysis</p>
          <h3 className="mp-stats-title" style={{ marginBottom: '1.25rem' }}>사진 자세 현황</h3>

          {photoLoading && <div className="mp-stats-empty">불러오는 중...</div>}

          {!photoLoading && !photoStats && (
            <div className="mp-stats-empty">저장된 사진 분석 기록이 없습니다.</div>
          )}

          {!photoLoading && photoStats && (
            <>
              <div className="mp-metrics">
                <div className="mp-metric">
                  <span>총 분석</span>
                  <strong>{photoStats.total}회</strong>
                </div>
                <div className="mp-metric">
                  <span>거북목 감지율</span>
                  <strong className={`mp-score ${photoStats.neckRate != null && photoStats.neckRate >= 50 ? 'bad' : photoStats.neckRate != null && photoStats.neckRate >= 25 ? 'warning' : 'good'}`}>
                    {photoStats.neckRate != null ? `${photoStats.neckRate}%` : '-'}
                  </strong>
                </div>
                <div className="mp-metric">
                  <span>마지막 분석</span>
                  <strong>{photoStats.lastDate ? daysAgo(photoStats.lastDate) : '-'}</strong>
                </div>
              </div>

              {photoStats.loaded > 0 && (
                <div className="mp-bar-section">
                  <p className="mp-bar-label">자세 등급 분포</p>
                  <div className="mp-stacked-bar">
                    <div className="mp-bar-good"    style={{ width: `${photoStats.good / photoStats.loaded * 100}%` }} />
                    <div className="mp-bar-warning"  style={{ width: `${photoStats.warning / photoStats.loaded * 100}%` }} />
                    <div className="mp-bar-bad"      style={{ width: `${photoStats.bad / photoStats.loaded * 100}%` }} />
                  </div>
                  <div className="mp-bar-legend">
                    <span className="mp-legend-item good">
                      좋음 {Math.round(photoStats.good / photoStats.loaded * 100)}%
                    </span>
                    <span className="mp-legend-item warning">
                      주의 {Math.round(photoStats.warning / photoStats.loaded * 100)}%
                    </span>
                    <span className="mp-legend-item bad">
                      나쁨 {Math.round(photoStats.bad / photoStats.loaded * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

      </main>
    </>
  )
}

function daysAgo(isoStr: string) {
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}
