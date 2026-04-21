import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { logout } from '../store/authSlice'
import { clearAuth } from '../services/authService'
import '../styles/page-header.css'

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
      <div style={{ padding: '20px' }}>
        <button onClick={handleLogout} style={{ padding: '8px 20px', cursor: 'pointer' }}>
          로그아웃
        </button>
      </div>
    </>
  )
}
