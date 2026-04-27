/**
 * 로그인 페이지
 * 카카오, 구글 소셜 로그인
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { loginSuccess, loginFailure } from '../store/authSlice'
import { getPostLoginPath, saveToken, saveUserInfo } from '../services/authService'
import apiClient from '../services/api'
import '../styles/login.scss'

declare global {
  interface Window {
    Kakao: any
  }
}

interface DevMemberOption {
  member_id: number
  provider: string
  nickname?: string | null
  role: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devMembers, setDevMembers] = useState<DevMemberOption[]>([])
  const [isDevPickerOpen, setIsDevPickerOpen] = useState(false)

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
            console.log('카카오 인가 성공:', authObj)

            // 백엔드에 카카오 액세스 토큰 전송
            const response = await apiClient.post('/auth/kakao', {
              access_token: authObj.access_token,
            })

            console.log('백엔드 응답:', response.data)

            const { access_token, user } = response.data

            // 토큰과 사용자 정보 저장
            saveToken(access_token)
            saveUserInfo(user)

            // Redux 상태 업데이트
            dispatch(loginSuccess({ user, token: access_token }))

            navigate(getPostLoginPath(user, response.data))
          } catch (err: any) {
            console.error('백엔드 에러:', err.response?.data || err.message)
            const errorMsg = err.response?.data?.detail || err.message || '로그인 실패'
            setError(errorMsg)
            dispatch(loginFailure(errorMsg))
          } finally {
            setLoading(false)
          }
        },
        fail: (error: any) => {
          console.error('카카오 로그인 실패:', error)
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

      const response = await apiClient.get<DevMemberOption[]>('/auth/dev-members')
      setDevMembers(response.data)
      setIsDevPickerOpen(true)
    } catch (err: any) {
      setError('개발용 회원 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDevMemberLogin = async (memberId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.post('/auth/dev-login', {
        member_id: memberId,
      })
      const { access_token, user } = response.data

      saveToken(access_token)
      saveUserInfo(user)
      dispatch(loginSuccess({ user, token: access_token }))
      setIsDevPickerOpen(false)
      navigate(getPostLoginPath(user, response.data))
    } catch (err: any) {
      setError('선택한 개발용 회원으로 로그인하지 못했습니다.')
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
      navigate(getPostLoginPath(user, response.data))
    } catch (err: any) {
      setError('개발용 관리자 로그인 실패')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 구글 로그인 ====================
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true)
      setError(null)

      console.log('구글 인가 성공')

      // 백엔드에 구글 ID Token 전송
      const response = await apiClient.post('/auth/google', {
        token: credentialResponse.credential,
      })

      console.log('백엔드 응답:', response.data)

      const { access_token, user } = response.data

      // 토큰과 사용자 정보 저장
      saveToken(access_token)
      saveUserInfo(user)

      // Redux 상태 업데이트
      dispatch(loginSuccess({ user, token: access_token }))

      navigate(getPostLoginPath(user, response.data))
    } catch (err: any) {
      logRequestError('백엔드 에러:', err)
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

      {import.meta.env.DEV && isDevPickerOpen && (
        <div className="dev-member-overlay" onClick={() => !loading && setIsDevPickerOpen(false)}>
          <div className="dev-member-modal" onClick={(event) => event.stopPropagation()}>
            <div className="dev-member-modal__header">
              <h2>개발용 회원 선택</h2>
              <button type="button" onClick={() => setIsDevPickerOpen(false)} disabled={loading}>
                닫기
              </button>
            </div>
            <p className="dev-member-modal__desc">member id 6~15 중 로그인할 회원을 선택하세요.</p>
            <div className="dev-member-list">
              {devMembers.map((member) => (
                <button
                  key={member.member_id}
                  type="button"
                  className="dev-member-item"
                  onClick={() => handleDevMemberLogin(member.member_id)}
                  disabled={loading}
                >
                  <span className="dev-member-item__id">#{member.member_id}</span>
                  <span className="dev-member-item__name">{member.nickname || '이름 없음'}</span>
                  <span className="dev-member-item__meta">
                    {member.provider} · {member.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
