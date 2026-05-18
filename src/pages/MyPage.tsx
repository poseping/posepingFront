import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import MyProfileCard from '../components/MyPage/MyProfileCard'
import MyHabitsCard from '../components/MyPage/MyHabitsCard'
import MyPreferencesCard from '../components/MyPage/MyPreferencesCard'
import MyWebcamSettingsCard from '../components/MyPage/MyWebcamSettingsCard'
import { loginSuccess, logout } from '../store/authSlice'
import { clearAuth, saveUserInfo } from '../services/authService'
import { deleteAccount, getRandomNickname, updateNickname, getLifestyleHabits } from '../services/memberApi'
import type { RootState } from '../store/store'
import '../styles/pages/my-page.scss'


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

  const randomNicknameMutation = useMutation({
    mutationFn: getRandomNickname,
    onSuccess: (data) => {
      setNicknameInput(data.nickname)
    },
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


  const handleNicknameRandomChange = () => {
    randomNicknameMutation.mutate()
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

  const handleLogout = () => {
    dispatch(logout())
    clearAuth()
    navigate('/login')
  }

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDeleteAccount = () => {
    deleteMutation.mutate()
  }

  const handleCloseDeleteConfirm = () => {
    if (deleteMutation.isPending) return
    setShowDeleteConfirm(false)
  }

  const providerLabel =
    user?.provider === 'KAKAO' ? '카카오 로그인' :
    user?.provider === 'GOOGLE' ? '구글 로그인' :
    user?.provider ?? ''


  return (
    <>
      <PageHeader />
      <main className="page-content">

        {/* ── 회원 정보 카드 ── */}
        <MyProfileCard
          user={user}
          editingNickname={editingNickname}
          nicknameInput={nicknameInput}
          providerLabel={providerLabel}
          provider={user?.provider}
          isRandomNicknamePending={randomNicknameMutation.isPending}
          isNicknamePending={nicknameMutation.isPending}
          isNicknameError={nicknameMutation.isError}
          isDeletePending={deleteMutation.isPending}
          onNicknameInputChange={setNicknameInput}
          onEditNickname={() => {
            setNicknameInput(user?.nickname ?? '')
            setEditingNickname(true)
          }}
          onRandomNickname={handleNicknameRandomChange}
          onSaveNickname={handleNicknameSave}
          onCancelNickname={handleNicknameCancel}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* ── 생활 습관 ── */}
        <MyHabitsCard
          habitData={habitData}
          habitLoading={habitLoading}
          onStartAnalysis={() => navigate('/assistant')}
          onRetakeHabits={() => navigate('/onboarding')}
        />

        {/* ── 알림 및 설정 ── */}
        <MyPreferencesCard />

        {/* ── 웹캠 자세 분석 설정 ── */}
        <MyWebcamSettingsCard />

      </main>

      {showDeleteConfirm && (
        <div className="modal mp-delete-modal" role="dialog" aria-modal="true" aria-labelledby="mp-delete-modal-title">
          <div className="modal__backdrop mp-delete-modal__backdrop" onClick={handleCloseDeleteConfirm} />
          <section className="modal__card mp-delete-modal__card">
            <div className="mp-delete-modal__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>

            <h2 id="mp-delete-modal-title" className="mp-delete-modal__title">정말 탈퇴하시겠어요?</h2>
            <p className="mp-delete-modal__desc">
              <strong>{user?.nickname ?? '사용자'}님</strong> 님의 계정이 삭제돼요.<br />
              한 번 탈퇴하면 되돌릴 수 없으니 신중하게 결정해 주세요.
            </p>

            <div className="mp-delete-modal__notice">
              <ul>
                <li>지금까지 쌓은 자세 분석 기록과 습관 데이터가 모두 삭제됩니다</li>
                <li>같은 계정으로 재가입해도 이전 기록은 복구되지 않습니다</li>
              </ul>
            </div>

            <div className="mp-delete-modal__actions">
              <button
                className="mp-delete-modal__cancel"
                type="button"
                onClick={handleCloseDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                className="mp-delete-modal__confirm"
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? '탈퇴 중...' : '탈퇴하기'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

