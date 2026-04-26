import type { AxiosError } from 'axios'
import apiClient from './api'
import type { PhotoAnalysisMode, PhotoAnalysisStatus, PhotoSideMetrics, PhotoSideView, PhotoMetrics } from './photoAnalysisApi'

export interface WebcamCommentRequest {
  status: string
  deviation_score: number
  issues?: string[]
  profile_name?: string | null
  ai_context?: Record<string, unknown>
  judgement_signature: string
  previous_judgement_signature?: string | null
}

export interface WebcamCommentResponse {
  requested: boolean
  judgement_changed: boolean
  judgement_signature: string
  comment: string | null
}

export interface PhotoCommentRequest {
  status: string
  analysis_mode: string
  confidence: number
  side_view: string
  issues?: string[]
  alerts?: string[]
  missing_landmarks?: string[]
  front?: object
  side?: object
}

export interface PhotoCommentResponse {
  comment: string
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface OnboardingChatRequest {
  user_prompt: string
  chat_history?: ChatHistoryItem[]
  collected_fields?: Record<string, string>
}

export interface OnboardingMissingField {
  key: string
  label: string
  description: string
}

export interface OnboardingChatResponse {
  reply: string | null
  done: boolean
  stop_reason: 'completed' | 'max_turn_reached' | string | null
  collected_fields: Record<string, string>
  missing_fields: OnboardingMissingField[]
  turn_count: number
  max_turns: number
}

export function getAssistantErrorMessage(error: unknown, fallbackMessage: string) {
  const axiosError = error as AxiosError<{ detail?: unknown }>
  const status = axiosError.response?.status
  const detail = axiosError.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (status === 401) {
    return '인증이 만료되었어요. 다시 로그인한 뒤 시도해 주세요.'
  }

  if (status === 422) {
    return '전달한 분석 데이터 형식이 올바르지 않아 요청을 처리하지 못했어요.'
  }

  if (status === 503) {
    return 'AI 응답 생성이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

export const getWebcamComment = async (
  payload: WebcamCommentRequest,
): Promise<WebcamCommentResponse> => {
  const response = await apiClient.post<WebcamCommentResponse>(
    '/assistant/webcam-comment',
    payload,
  )
  return response.data
}

export const getPhotoComment = async (
  payload: PhotoCommentRequest,
): Promise<PhotoCommentResponse> => {
  const response = await apiClient.post<PhotoCommentResponse>(
    '/assistant/photo-comment',
    payload,
  )
  return response.data
}

export const sendOnboardingChat = async (
  payload: OnboardingChatRequest,
): Promise<OnboardingChatResponse> => {
  const response = await apiClient.post<OnboardingChatResponse>(
    '/assistant/onboarding-chat',
    payload,
  )
  return response.data
}

export function buildPhotoCommentPayload(result: {
  status: PhotoAnalysisStatus
  analysis_mode: PhotoAnalysisMode
  confidence: number
  side_view: PhotoSideView
  issues: string[]
  alerts: string[]
  missing_landmarks: string[]
  front: PhotoMetrics
  side: PhotoSideMetrics
}): PhotoCommentRequest {
  return {
    status: result.status,
    analysis_mode: result.analysis_mode,
    confidence: result.confidence,
    side_view: result.side_view,
    issues: result.issues,
    alerts: result.alerts,
    missing_landmarks: result.missing_landmarks,
    front: result.front,
    side: result.side,
  }
}
