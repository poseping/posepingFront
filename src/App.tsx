/**
 * 애플리케이션 진입점
 * 라우터 설정 및 상태 관리
 */

import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/AppLayout'
import ScrollToTop from './components/ScrollToTop'
import { RootState } from './store/store'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const WebcamPage = lazy(() => import('./pages/WebcamPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const FirstLoginChoicePage = lazy(() => import('./pages/FirstLoginChoicePage'))
const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const PhotoPage = lazy(() => import('./pages/PhotoPage'))
const PhotoHistoryStatsPage = lazy(() => import('./pages/PhotoHistoryStatsPage'))
const WebcamHistoryStatsPage = lazy(() => import('./pages/WebcamHistoryStatsPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminMembersPage = lazy(() => import('./pages/AdminMembersPage'))
const KakaoCallbackPage = lazy(() => import('./pages/KakaoCallbackPage'))

function App() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <Router>
      <ScrollToTop />
      <div className="app-frame">
      <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
          <Route
            path="/first-login"
            element={
              <ProtectedRoute>
                <FirstLoginChoicePage />
              </ProtectedRoute>
            }
          />

          {/* 로그인 후 공통 레이아웃 (하단 메뉴바 포함) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/home"     element={<HomePage />} />
            <Route path="/onboarding" element={<AssistantPage />} />
            <Route path="/webcam"   element={<WebcamPage />} />
            <Route path="/webcam/stats" element={<WebcamHistoryStatsPage />} />
            <Route path="/photo"    element={<PhotoPage />} />
            <Route path="/photo/stats" element={<PhotoHistoryStatsPage />} />
            <Route path="/mypage"   element={<MyPage />} />
            <Route path="/mypage/settings" element={<SettingsPage />} />
            <Route path="/admin" element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/webcam" replace />} />
            <Route path="/admin/members" element={isAdmin ? <AdminMembersPage /> : <Navigate to="/webcam" replace />} />
          </Route>

          <Route path="/" element={<Navigate to="/webcam" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      </div>
    </Router>
    </GoogleOAuthProvider>
  )
}

export default App
