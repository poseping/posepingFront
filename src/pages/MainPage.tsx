/**
 * 메인 페이지
 * 자세 모니터링 (기존 App 컴포넌트)
 */

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import WebcamStream from '../components/Webcam/WebcamStream'
import PhotoAnalysisStudio from '../components/PhotoAnalysis/PhotoAnalysisStudio'
import { logout } from '../store/authSlice'
import { clearAuth } from '../services/authService'
import '../styles/global.css'
import '../styles/main-page.css'

function MainPage() {
  const [isActive, setIsActive] = useState(false)
  const [activeView, setActiveView] = useState<'realtime' | 'photo'>('realtime')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    // Redux 상태 초기화
    dispatch(logout())
    // 로컬스토리지 초기화
    clearAuth()
    // 로그인 페이지로 이동
    navigate('/login')
  }

  return (
    <div className="app">
      <header>
        <h1>바른자세 감시 시스템</h1>
        <button className="logout-btn" onClick={handleLogout}>
          로그아웃
        </button>
      </header>
      <main>
        <div className="main-page-content">
          <div className="analysis-tabs">
            <button
              className={`analysis-tab ${activeView === 'realtime' ? 'active' : ''}`}
              onClick={() => setActiveView('realtime')}
            >
              실시간 분석
            </button>
            <button
              className={`analysis-tab ${activeView === 'photo' ? 'active' : ''}`}
              onClick={() => {
                setIsActive(false)
                setActiveView('photo')
              }}
            >
              사진 분석
            </button>
          </div>

          {activeView === 'realtime' ? (
            <WebcamStream isActive={isActive} onToggle={() => setIsActive(!isActive)} />
          ) : (
            <PhotoAnalysisStudio />
          )}
        </div>
      </main>
    </div>
  )
}

export default MainPage
