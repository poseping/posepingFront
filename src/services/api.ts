import axios from 'axios'
import { getToken, clearAuth } from './authService'

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE = envApiBaseUrl || '/api'

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
    if (!error.response) {
      console.error('API network error', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      })
    }

    if (error.response?.status === 401) {
      // 토큰 만료 또는 유효하지 않음
      clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

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

export interface PostureProfile {
  profile_id: number
  member_id: number
  profile_name: string
  monitor_label: string | null
  display_order: number
  description: string | null
  reference_landmarks: object
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebcamAnalyzeResponse {
  status: 'good' | 'warning' | 'bad'
  deviation_score: number
  profile_id: number
  profile_name: string
  issues: string[]
  per_point: Record<string, number>
  landmarks: Landmark[]
  frame_width: number
  frame_height: number
}

// 구 자세 분석 (랜드마크 추출용)
export const analyzePose = async (imageBase64: string): Promise<PoseAnalysisResponse> => {
  const response = await apiClient.post<PoseAnalysisResponse>(
    '/pose/analyze',
    { image_base64: imageBase64 }
  )
  return response.data
}

// 기준 자세 등록
export const registerPostureProfile = async (
  landmarks: Landmark[],
  profileName = '기본 자세'
): Promise<PostureProfile> => {
  const response = await apiClient.post<PostureProfile>('/webcam/posture-profile', {
    reference_landmarks: landmarks,
    profile_name: profileName,
  })
  return response.data
}

// 기준 자세 목록 조회
export const getPostureProfiles = async (): Promise<PostureProfile[]> => {
  const response = await apiClient.get<PostureProfile[]>('/webcam/posture-profile')
  return response.data
}

// 웹캠 이미지 vs 기준 자세 비교 분석
export const analyzeWebcam = async (imageBase64: string, profileId?: number): Promise<WebcamAnalyzeResponse> => {
  const response = await apiClient.post<WebcamAnalyzeResponse>('/webcam/analyze', {
    image_base64: imageBase64,
    profile_id: profileId ?? null,
  })
  return response.data
}

// 헬스 체크
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/pose/health')
  return response.data
}

export default apiClient
