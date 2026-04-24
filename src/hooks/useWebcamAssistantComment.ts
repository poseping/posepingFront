import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getAssistantErrorMessage, getWebcamComment } from '../services/assistantApi'

export interface WebcamAssistantAnalyzeInput {
  status: string
  deviation_score: number
  issues: string[]
  profile_name: string
  ai_context?: Record<string, unknown>
  judgement_signature?: string
}

export function useWebcamAssistantComment(isSessionActive: boolean) {
  const previousJudgementSignatureRef = useRef<string | null>(null)
  const pendingJudgementSignatureRef = useRef<string | null>(null)
  const [assistantComment, setAssistantComment] = useState<string | null>(null)
  const [assistantError, setAssistantError] = useState<string | null>(null)

  const { mutate: requestWebcamComment, isPending: isAssistantCommentPending } = useMutation({
    mutationFn: getWebcamComment,
    onSuccess: (data, variables) => {
      pendingJudgementSignatureRef.current = null
      previousJudgementSignatureRef.current = data.judgement_signature || variables.judgement_signature
      if (data.requested && data.comment) {
        setAssistantComment(data.comment)
      }
      setAssistantError(null)
    },
    onError: (error) => {
      pendingJudgementSignatureRef.current = null
      setAssistantError(getAssistantErrorMessage(error, '웹캠 코멘트를 불러오지 못했습니다.'))
    },
  })

  useEffect(() => {
    if (!isSessionActive) {
      previousJudgementSignatureRef.current = null
      pendingJudgementSignatureRef.current = null
    }
  }, [isSessionActive])

  const handleAnalyzeResult = (result: WebcamAssistantAnalyzeInput) => {
    if (!result.judgement_signature) return
    if (result.judgement_signature === previousJudgementSignatureRef.current) return
    if (result.judgement_signature === pendingJudgementSignatureRef.current) return

    pendingJudgementSignatureRef.current = result.judgement_signature
    requestWebcamComment({
      status: result.status,
      deviation_score: result.deviation_score,
      issues: result.issues,
      profile_name: result.profile_name,
      ai_context: result.ai_context,
      judgement_signature: result.judgement_signature,
      previous_judgement_signature: previousJudgementSignatureRef.current,
    })
  }

  const resetAssistantComment = useCallback(() => {
    previousJudgementSignatureRef.current = null
    pendingJudgementSignatureRef.current = null
    setAssistantComment(null)
    setAssistantError(null)
  }, [])

  return {
    assistantComment,
    assistantError,
    isAssistantCommentPending,
    handleAnalyzeResult,
    resetAssistantComment,
  }
}
