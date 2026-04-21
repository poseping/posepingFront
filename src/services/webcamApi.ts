import apiClient from './api'
import type { Landmark } from './api'

export type { Landmark }

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

export const getPostureProfiles = async (): Promise<PostureProfile[]> => {
  const response = await apiClient.get<PostureProfile[]>('/webcam/posture-profile')
  return response.data
}

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

export const updatePostureProfile = async (
  profileId: number,
  data: { profile_name?: string; monitor_label?: string; description?: string; is_active?: boolean }
): Promise<PostureProfile> => {
  const response = await apiClient.patch<PostureProfile>(`/webcam/posture-profile/${profileId}`, data)
  return response.data
}

export const deletePostureProfile = async (profileId: number): Promise<void> => {
  await apiClient.delete(`/webcam/posture-profile/${profileId}`)
}

export const analyzeWebcam = async (imageBase64: string, profileId?: number): Promise<WebcamAnalyzeResponse> => {
  const response = await apiClient.post<WebcamAnalyzeResponse>('/webcam/analyze', {
    image_base64: imageBase64,
    profile_id: profileId ?? null,
  })
  return response.data
}
