import { useState } from 'react'
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
import type { RootState } from '../store/store'
import '../styles/my-page.scss'


export default function MyPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const token = useSelector((state: RootState) => state.auth.token) ?? ''

  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(user?.nickname ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: habitData, isLoading: habitLoading } = useQuery({
    queryKey: ['lifestyle-habit'],
    queryFn: getLifestyleHabits,
    staleTime: 5 * 60 * 1000,
  })


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
                    className="btn-icon"
                    onClick={handleNicknameSave}
                    disabled={nicknameMutation.isPending}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                  <button className="btn-icon" onClick={handleNicknameCancel}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <div className="mp-nickname-row">
                  <h2 className="mp-nickname">{user?.nickname ?? '사용자'}</h2>
                  <button
                    className="btn-icon"
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
            <button className="btn--secondary" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              로그아웃
            </button>
            <button
              className="btn--danger-outline"
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
                  className="btn--secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </button>
                <button
                  className="btn--danger"
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
                <button className="btn--tonal" onClick={() => navigate('/assistant')}>
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
                <button className="btn--tonal" onClick={() => navigate('/onboarding')}>
                  다시 답변하기 <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </>
          )}
        </section>


      </main>
    </>
  )
}

