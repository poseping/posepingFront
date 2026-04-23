/**
 * 애플리케이션 진입점
 * 라우터 설정 및 상태 관리
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import MyPage from './pages/MyPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ScrollToTop from './components/ScrollToTop'
import './styles/global.css'

function App() {

  return (
    <Router>
      <ScrollToTop />
      <div className="app-frame">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* 로그인 후 공통 레이아웃 (하단 메뉴바 포함) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home"     element={<HomePage />} />
          <Route path="/main"     element={<MainPage />} />
          <Route path="/history"  element={<HistoryPage />} />
          <Route path="/mypage"   element={<MyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/main" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </div>
    </Router>
  )
}

export default App
