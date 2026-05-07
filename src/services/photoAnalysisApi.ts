import apiClient from './api'

export type PhotoSideView = 'left' | 'right'
export type PhotoAnalysisStatus = 'good' | 'warning' | 'bad' | 'action_required'
export type PhotoAnalysisMode = 'full' | 'upper_body_only' | 'manual_adjustment_required'

export interface PhotoMetrics {
  confidence: number
  shoulder_slope: number | null
  hip_slope: number | null
  spine_alignment: number | null
  asymmetry_score: number | null
}

export interface PhotoSideMetrics {
  confidence: number
  neck_forward_angle: number | null
  forward_head_detected: boolean | null
}

export interface ManualLandmarkInput {
  id: number
  name?: string
  x: number
  y: number
  z: number
  visibility: number
}

export interface PhotoAnalysisResponse {
  status: PhotoAnalysisStatus
  analysis_mode: PhotoAnalysisMode
  confidence: number
  analyzed_at: string
  side_view: PhotoSideView
  images_stored: boolean
  can_save: boolean
  alerts: string[]
  missing_landmarks: string[]
  available_actions: string[]
  front: PhotoMetrics
  side: PhotoSideMetrics
  front_landmarks: ManualLandmarkInput[]
  side_landmarks: ManualLandmarkInput[]
  issues: string[]
  save_token: string | null
}

export interface SavePhotoAnalysisResponse {
  analysis_id: number
  saved_at: string
  status: 'good' | 'warning' | 'bad'
  images_stored: boolean
}

export interface PhotoAnalysisHistoryItem {
  id?: number
  analysis_id?: number
  status?: 'good' | 'warning' | 'bad'
  analysis_mode?: PhotoAnalysisMode
  confidence?: number
  ai_message?: string | null
  analyzed_at?: string
  saved_at?: string
  created_at?: string
  alerts?: string[]
  issues?: string[]
  missing_landmarks?: string[]
  front?: Partial<PhotoMetrics>
  side?: Partial<PhotoSideMetrics>
  shoulder_slope?: number | null
  hip_slope?: number | null
  asymmetry_score?: number | null
  spine_alignment?: number | null
  neck_forward_angle?: number | null
}

export const analyzePhotoFiles = async (
  frontImage: File,
  sideImage: File,
  sideView: PhotoSideView
): Promise<PhotoAnalysisResponse> => {
  const formData = new FormData()
  formData.append('front_image', frontImage)
  formData.append('side_image', sideImage)
  formData.append('side_view', sideView)

  const response = await apiClient.post<PhotoAnalysisResponse>('/photo/analyze-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export const analyzeManualPhotoLandmarks = async (
  sideView: PhotoSideView,
  frontLandmarks: ManualLandmarkInput[],
  sideLandmarks: ManualLandmarkInput[]
): Promise<PhotoAnalysisResponse> => {
  const response = await apiClient.post<PhotoAnalysisResponse>('/photo/analyze-manual-landmarks', {
    side_view: sideView,
    front_landmarks: frontLandmarks,
    side_landmarks: sideLandmarks,
  })

  return response.data
}

export const savePhotoAnalysis = async (
  saveToken: string,
  aiMessage?: string | null
): Promise<SavePhotoAnalysisResponse> => {
  const response = await apiClient.post<SavePhotoAnalysisResponse>('/photo/analyses', {
    save_token: saveToken,
    ai_message: aiMessage,
  })

  return response.data
}

export const deletePhotoAnalysis = async (analysisId: number | string): Promise<void> => {
  await apiClient.delete(`/photo/analyses/${analysisId}`)
}

export const getPhotoAnalysisHistory = async (): Promise<PhotoAnalysisHistoryItem[]> => {
  const response = await apiClient.get<
    PhotoAnalysisHistoryItem[] | {
      items?: PhotoAnalysisHistoryItem[]
      analyses?: PhotoAnalysisHistoryItem[]
      results?: PhotoAnalysisHistoryItem[]
    }
  >('/photo/analyses')

  if (Array.isArray(response.data)) {
    return response.data
  }

  return response.data.items ?? response.data.analyses ?? response.data.results ?? []
}
