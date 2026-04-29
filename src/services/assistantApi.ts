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

const ONBOARDING_CHAT_TIMEOUT_MS = 15_000
const ONBOARDING_CHAT_RETRY_COUNT = 0

class AssistantRequestTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssistantRequestTimeoutError'
  }
}

export function getAssistantErrorMessage(error: unknown, fallbackMessage: string) {
  const axiosError = error as AxiosError<{ detail?: unknown }>
  const status = axiosError.response?.status
  const detail = axiosError.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (status === 401 ) {
    return '인증이 만료되었어요. 다시 로그인한 뒤 시도해 주세요.'
  }

  if (status === 422 || status === 503) {
    return '척추PING이 잠시 바쁜 것 같아요. 다시 물어봐주세요!'
  }

  if (error instanceof AssistantRequestTimeoutError) {
    return error.message
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
  for (let attempt = 1; attempt <= ONBOARDING_CHAT_RETRY_COUNT + 1; attempt += 1) {
    try {
      return await sendOnboardingChatAttempt(payload, attempt)
    } catch (error) {
      if (!(error instanceof AssistantRequestTimeoutError) || attempt > ONBOARDING_CHAT_RETRY_COUNT) {
        throw error
      }

      console.warn('Onboarding chat request timed out; retrying', {
        attempt,
        nextAttempt: attempt + 1,
        timeoutMs: ONBOARDING_CHAT_TIMEOUT_MS,
      })
    }
  }

  throw new AssistantRequestTimeoutError('척추PING이 잠시 바쁜 것 같아요. 다시 물어봐주세요!')
}

async function sendOnboardingChatAttempt(
  payload: OnboardingChatRequest,
  attempt: number,
): Promise<OnboardingChatResponse> {
  const controller = new AbortController()
  const startedAt = Date.now()
  let timedOut = false

  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ONBOARDING_CHAT_TIMEOUT_MS)

  try {
    const response = await apiClient.post<OnboardingChatResponse>(
      '/assistant/onboarding-chat',
      payload,
      { signal: controller.signal },
    )

    console.info('Onboarding chat request completed', {
      attempt,
      elapsedMs: Date.now() - startedAt,
      done: response.data.done,
      stopReason: response.data.stop_reason,
    })

    return response.data
  } catch (error) {
    if (timedOut) {
      console.warn('Onboarding chat request aborted by client timeout', {
        attempt,
        elapsedMs: Date.now() - startedAt,
        timeoutMs: ONBOARDING_CHAT_TIMEOUT_MS,
      })

      throw new AssistantRequestTimeoutError('척추PING이 잠시 바쁜 것 같아요. 다시 물어봐주세요!')
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
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
