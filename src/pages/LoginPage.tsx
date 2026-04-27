/**
 * 로그인 페이지
 * 카카오, 구글 소셜 로그인
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useGoogleLogin } from '@react-oauth/google'
import { loginSuccess, loginFailure } from '../store/authSlice'
import { saveToken, saveUserInfo } from '../services/authService'
import apiClient from '../services/api'
import '../styles/login.scss'

declare global {
  interface Window {
    Kakao: any
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logRequestError = (label: string, err: any) => {
    console.error(label, {
      message: err?.message,
      code: err?.code,
      status: err?.response?.status,
      data: err?.response?.data,
      url: err?.config?.url,
      baseURL: err?.config?.baseURL,
      method: err?.config?.method,
    })
  }

  // ==================== 카카오 로그인 ====================
  const handleKakaoLogin = () => {
    const callbackUrl = `${window.location.origin}/auth/kakao/callback`
    const kakaoAuthUrl =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${import.meta.env.VITE_KAKAO_REST_KEY}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&response_type=code`

    const popup = window.open(kakaoAuthUrl, 'kakaoLogin', 'width=500,height=600,scrollbars=yes')
    if (!popup) {
      setError('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.')
      return
    }

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'KAKAO_AUTH_CODE') return
      window.removeEventListener('message', handleMessage)

      try {
        setLoading(true)
        setError(null)
        const response = await apiClient.post('/auth/kakao', { code: event.data.code })
        const { access_token, user } = response.data
        saveToken(access_token)
        saveUserInfo(user)
        dispatch(loginSuccess({ user, token: access_token }))
        navigate('/home')
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || '카카오 로그인 실패'
        setError(errorMsg)
        dispatch(loginFailure(errorMsg))
      } finally {
        setLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
  }

  // ==================== 개발용 로그인 ====================
  const handleDevLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.post('/auth/dev-login')
      const { access_token, user } = response.data

      saveToken(access_token)
      saveUserInfo(user)
      dispatch(loginSuccess({ user, token: access_token }))
      navigate('/home')
    } catch (err: any) {
      setError('개발용 로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleDevAdminLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.post('/auth/admin-login', {
        admin_id: 'admin',
        password: 'admin1234',
      })
      const { access_token, user } = response.data

      saveToken(access_token)
      saveUserInfo(user)
      dispatch(loginSuccess({ user, token: access_token }))
      navigate('/admin')
    } catch (err: any) {
      setError('개발용 관리자 로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 구글 로그인 ====================
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async ({ code }) => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.post('/auth/google', { code })
        const { access_token, user } = response.data

        saveToken(access_token)
        saveUserInfo(user)
        dispatch(loginSuccess({ user, token: access_token }))
        navigate('/home')
      } catch (err: any) {
        logRequestError('구글 백엔드 에러:', err)
        const errorMsg = err.response?.data?.detail || err.message || '로그인 실패'
        setError(errorMsg)
        dispatch(loginFailure(errorMsg))
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      setError('구글 로그인 실패')
    },
  })

  return (
    <div className="login-page">
      {/* 로고 영역 */}
      <div className="login-hero">
        <div className="login-logo">척</div>
        <h1 className="login-title">척추Ping</h1>
        <p className="login-desc">바른 자세 습관을 만들어드려요</p>
      </div>

      {/* 로그인 카드 */}
      <div className="login-card">
        <p className="login-card-label">소셜 계정으로 시작하기</p>

        {error && <div className="error-message">{error}</div>}

        <div className="login-buttons">
          <button
            className="kakao-login-btn"
            onClick={handleKakaoLogin}
            disabled={loading}
          >
            <img src="/assets/img/kakao_login_medium_narrow.png" alt="카카오 로그인"/>
          </button>

          <button
            className="google-login-btn"
            onClick={() => googleLogin()}
            disabled={loading}
          >
            <img src="/assets/img/google_logo.svg" alt="" width={18} height={18} />
            Google로 로그인
          </button>
        </div>

        {import.meta.env.DEV && (
          <div className="dev-login-actions">
            <button className="dev-login-btn" onClick={handleDevLogin} disabled={loading}>
              개발용 로그인
            </button>
            <button className="dev-login-btn" onClick={handleDevAdminLogin} disabled={loading}>
              개발용 관리자 로그인
            </button>
          </div>
        )}
      </div>

      <p className="login-footer">로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로 간주됩니다</p>
    </div>
  )
}
