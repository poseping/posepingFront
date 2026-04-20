/**
 * 로그인 페이지
 * 카카오, 구글 소셜 로그인
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { loginSuccess, loginFailure } from '../store/authSlice'
import { saveToken, saveUserInfo } from '../services/authService'
import apiClient from '../services/api'
import '../styles/login.css'

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
  const handleKakaoLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      // Kakao SDK 초기화 (JavaScript 키 사용)
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY)
      }

      // 카카오 로그인 팝업
      window.Kakao.Auth.login({
        success: async (authObj: any) => {
          try {
            console.log('✅ 카카오 인가 성공:', authObj)

            // 백엔드에 카카오 액세스 토큰 전송
            const response = await apiClient.post('/auth/kakao', {
              access_token: authObj.access_token,
            })

            console.log('✅ 백엔드 응답:', response.data)

            const { access_token, user } = response.data

            // 토큰과 사용자 정보 저장
            saveToken(access_token)
            saveUserInfo(user)

            // Redux 상태 업데이트
            dispatch(loginSuccess({ user, token: access_token }))

            // 메인 페이지로 이동
            navigate('/main')
          } catch (err: any) {
            console.error('❌ 백엔드 에러:', err.response?.data || err.message)
            const errorMsg = err.response?.data?.detail || err.message || '로그인 실패'
            setError(errorMsg)
            dispatch(loginFailure(errorMsg))
          } finally {
            setLoading(false)
          }
        },
        fail: (error: any) => {
          console.error('❌ 카카오 로그인 실패:', error)
          setError(`카카오 로그인 실패: ${error?.error_description || '알 수 없는 오류'}`)
          setLoading(false)
        },
      })
    } catch (err) {
      setError('카카오 로그인 중 오류 발생')
      console.error(err)
    } finally {
      setLoading(false)
    }
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
      navigate('/main')
    } catch (err: any) {
      setError('개발용 로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 구글 로그인 ====================
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true)
      setError(null)

      console.log('✅ 구글 인가 성공')

      // 백엔드에 구글 ID Token 전송
      const response = await apiClient.post('/auth/google', {
        token: credentialResponse.credential,
      })

      console.log('✅ 백엔드 응답:', response.data)

      const { access_token, user } = response.data

      // 토큰과 사용자 정보 저장
      saveToken(access_token)
      saveUserInfo(user)

      // Redux 상태 업데이트
      dispatch(loginSuccess({ user, token: access_token }))

      // 메인 페이지로 이동
      navigate('/main')
    } catch (err: any) {
      logRequestError('❌ 백엔드 에러:', err)
      const errorMsg = err.response?.data?.detail || err.message || '로그인 실패'
      setError(errorMsg)
      dispatch(loginFailure(errorMsg))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    console.error('Google OAuth provider returned onError')
    setError('구글 로그인 실패')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>바른자세 감시 시스템</h1>
        <p className="subtitle">소셜 로그인으로 시작하세요</p>

        {error && <div className="error-message">{error}</div>}

        <div className="login-buttons">
          {/* 카카오 로그인 */}
          <button
            className="kakao-login-btn"
            onClick={handleKakaoLogin}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '카카오로 로그인'}
          </button>

          {/* 구글 로그인 */}
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <div className="google-login-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signin_with"
              />
            </div>
          </GoogleOAuthProvider>
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={handleDevLogin}
            disabled={loading}
            style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
          >
            [개발자] 바로 로그인
          </button>
        )}

        <p className="privacy-notice">
          로그인하면 서비스 약관에 동의합니다
        </p>
      </div>
    </div>
  )
}
