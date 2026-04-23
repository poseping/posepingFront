/**
 * 애플리케이션 진입점
 * 라우터 설정 및 상태 관리
 */

import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ScrollToTop from './components/ScrollToTop'
import { RootState } from './store/store'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const MainPage = lazy(() => import('./pages/MainPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminMembersPage = lazy(() => import('./pages/AdminMembersPage'))

function App() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  return (
    <Router>
      <ScrollToTop />
      <div className="app-frame">
      <Suspense fallback={null}>
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
            <Route path="/admin" element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/main" replace />} />
            <Route path="/admin/members" element={isAdmin ? <AdminMembersPage /> : <Navigate to="/main" replace />} />
          </Route>

          <Route path="/" element={<Navigate to="/main" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      </div>
    </Router>
  )
}

export default App
