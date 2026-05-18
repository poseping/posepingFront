import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket, faTrash } from '@fortawesome/free-solid-svg-icons'
import PageHeader from '../components/PageHeader'
import { logout } from '../store/authSlice'
import { clearAuth } from '../services/authService'
import { deleteAccount } from '../services/memberApi'
import '../styles/pages/settings.scss'

export default function SettingsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const clearSession = () => {
    queryClient.clear()
    dispatch(logout())
    clearAuth()
    navigate('/login')
  }

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      clearSession()
    },
  })

  const handleLogout = () => {
    clearSession()
  }

  return (
    <>
      <PageHeader />
      <main className="settings-page">
        <section className="card settings-account-card">
          <div>
            <p className="settings-kicker">Account</p>
            <h2>계정 설정</h2>
          </div>

          <div className="settings-action-list">
            <button className="settings-action settings-action--secondary" type="button" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              <span>로그아웃</span>
            </button>
            <button
              className="settings-action settings-action--danger"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FontAwesomeIcon icon={faTrash} />
              <span>회원탈퇴</span>
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="settings-delete-confirm">
              <p>정말로 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.</p>
              <div className="settings-confirm-row">
                <button
                  className="btn--secondary"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                >
                  취소
                </button>
                <button
                  className="btn--danger"
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '탈퇴 중...' : '탈퇴하기'}
                </button>
              </div>
            </div>
          )}

          <div className="settings-footer">
            <button className="btn--secondary" type="button" onClick={() => navigate('/mypage')}>
              돌아가기
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
