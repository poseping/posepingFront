import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { logout } from '../store/authSlice'
import { clearAuth } from '../services/authService'
import '../styles/page-header.css'
import '../styles/my-page.css'

export default function MyPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      <PageHeader title="마이페이지" description="내 프로필과 계정 정보를 관리하세요" />
      <main className="my-page">
        <button className="my-page__logout-button" onClick={handleLogout}>
          로그아웃
        </button>
      </main>
    </>
  )
}
