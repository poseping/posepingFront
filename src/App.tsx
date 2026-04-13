/**
 * 애플리케이션 진입점
 * 라우터 설정 및 상태 관리
 */

import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import ProtectedRoute from './components/ProtectedRoute'
import { setToken } from './store/authSlice'
import { getToken, getUserInfo } from './services/authService'
import { RootState } from './store/store'
import './styles/global.css'

function App() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  // 앱 시작 시 저장된 토큰 복원
  useEffect(() => {
    const token = getToken()
    const user = getUserInfo()

    if (token && user && !isAuthenticated) {
      dispatch(setToken({ user, token }))
    }
  }, [dispatch, isAuthenticated])

  return (
    <Router>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 보호된 라우트 */}
        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          }
        />

        {/* 기본 경로 */}
        <Route path="/" element={<Navigate to="/main" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
