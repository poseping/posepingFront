import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
