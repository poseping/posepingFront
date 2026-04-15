import axios from 'axios'
import { getToken, clearAuth } from './authService'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==================== 요청 인터셉터 ====================
// 모든 요청에 Authorization 헤더 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ==================== 응답 인터셉터 ====================
// 401 응답 시 자동으로 로그아웃
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 유효하지 않음
      clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface PoseAnalysisRequest {
  image: string // Base64 이미지
}

export interface Landmark {
  id: number
  name: string
  x: number
  y: number
  z: number
  visibility: number
}

export interface PoseAnalysisResponse {
  status: 'GOOD' | 'WARNING' | 'BAD'
  landmarks: Landmark[]
  frame_width: number
  frame_height: number
  neck_forward_angle: number
  shoulder_slope: number
  spine_alignment: number
  issues: string[]
  recommendations: string[]
  confidence: number
}

// 자세 분석
export const analyzePose = async (imageBase64: string): Promise<PoseAnalysisResponse> => {
  const response = await apiClient.post<PoseAnalysisResponse>(
    '/pose/analyze',
    { image_base64: imageBase64 }
  )
  return response.data
}

// 헬스 체크
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/pose/health')
  return response.data
}

export default apiClient
