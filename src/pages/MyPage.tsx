import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import PageHeader from '../components/PageHeader'
import MyProfileCard from '../components/MyPage/MyProfileCard'
import MyHabitsCard from '../components/MyPage/MyHabitsCard'
import MyPreferencesCard from '../components/MyPage/MyPreferencesCard'
import { loginSuccess } from '../store/authSlice'
import { saveUserInfo } from '../services/authService'
import { getRandomNickname, updateNickname, getLifestyleHabits } from '../services/memberApi'
import type { RootState } from '../store/store'
import '../styles/pages/my-page.scss'


export default function MyPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const token = useSelector((state: RootState) => state.auth.token) ?? ''

  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(user?.nickname ?? '')

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
          isRandomNicknamePending={randomNicknameMutation.isPending}
          isNicknamePending={nicknameMutation.isPending}
          isNicknameError={nicknameMutation.isError}
          onNicknameInputChange={setNicknameInput}
          onEditNickname={() => {
            setNicknameInput(user?.nickname ?? '')
            setEditingNickname(true)
          }}
          onRandomNickname={handleNicknameRandomChange}
          onSaveNickname={handleNicknameSave}
          onCancelNickname={handleNicknameCancel}
          onOpenSettings={() => navigate('/mypage/settings')}
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

      </main>
    </>
  )
}

