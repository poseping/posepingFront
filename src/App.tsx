/**
 * 애플리케이션 진입점
 * 라우터 설정 및 상태 관리
 */

import { lazy, Suspense, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/AppLayout'
import ScrollToTop from './components/ScrollToTop'
import { warmBackend } from './services/api'
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
const BRAND_LOGO_SRC = '/assets/logo/poseping_fill.png'

function BackendWarmupScreen({
}: {
  hasError: boolean
  onRetry: () => void
  onContinue: () => void
}) {
  return (
    <main className="app-warmup">
      <img className="app-warmup__logo" src={BRAND_LOGO_SRC} alt="PosePing" />
      <div className="app-warmup__spinner" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <span
            key={index}
            className="app-warmup__spinner-dot"
            style={{
              '--dot-angle': `${index * 45}deg`,
              '--dot-delay': `${(7 - index) * -0.2375}s`,
            } as CSSProperties}
          />
        ))}
      </div>
      <h1>앉아있는 시간, 안심할 수 있게.</h1>
      <p>
        포즈PING에 접속 중입니다.
      </p>
    </main>
  )
}

function BackendWarmupGate({ children }: { children: ReactNode }) {
  const shouldSkipWarmup = window.location.pathname === '/auth/kakao/callback'
  const [status, setStatus] = useState<'warming' | 'ready' | 'error'>(
    shouldSkipWarmup ? 'ready' : 'warming'
  )

  const wakeBackend = () => {
    if (shouldSkipWarmup) {
      setStatus('ready')
      return
    }

    setStatus('warming')
    warmBackend()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'))
  }

  useEffect(() => {
    wakeBackend()
  }, [])

  if (status !== 'ready') {
    return (
      <BackendWarmupScreen
        hasError={status === 'error'}
        onRetry={wakeBackend}
        onContinue={() => setStatus('ready')}
      />
    )
  }

  return <>{children}</>
}

function App() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <BackendWarmupGate>
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
    </BackendWarmupGate>
    </GoogleOAuthProvider>
  )
}

export default App
