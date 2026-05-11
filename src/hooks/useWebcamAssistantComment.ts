import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getAssistantErrorMessage,
  getWebcamComment,
} from "../services/assistantApi";

// 테스트용 : 추후 최소 60_000 (1분)으로 변경 예정
const BAD_POSTURE_THRESHOLD_MS = 10_000;

export interface WebcamAssistantAnalyzeInput {
  status: string;
  deviation_score: number;
  issues: string[];
  profile_name: string;
  ai_context?: Record<string, unknown>;
  judgement_signature?: string;
}

export function useWebcamAssistantComment(isSessionActive: boolean) {
  const badPostureStartRef = useRef<number | null>(null);
  const [assistantComment, setAssistantComment] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const { mutate: requestWebcamComment, isPending: isAssistantCommentPending } =
    useMutation({
      mutationFn: getWebcamComment,
      onSuccess: (data) => {
        if (data.requested && data.comment) {
          setAssistantComment(data.comment);
        }
        setAssistantError(null);
      },
      onError: (error) => {
        setAssistantError(
          getAssistantErrorMessage(error, "웹캠 코멘트를 불러오지 못했습니다."),
        );
      },
    });

  useEffect(() => {
    if (!isSessionActive) {
      badPostureStartRef.current = null;
    }
  }, [isSessionActive]);

  const handleAnalyzeResult = (result: WebcamAssistantAnalyzeInput) => {
    const isBadPosture = result.status === "warning" || result.status === "bad";

    if (!isBadPosture) {
      badPostureStartRef.current = null;
      return;
    }

    if (badPostureStartRef.current === null) {
      badPostureStartRef.current = Date.now();
      return;
    }

    const elapsed = Date.now() - badPostureStartRef.current;
    if (elapsed < BAD_POSTURE_THRESHOLD_MS) return;
    if (isAssistantCommentPending) return;

    badPostureStartRef.current = null;

    requestWebcamComment({
      status: result.status,
      deviation_score: result.deviation_score,
      issues: result.issues,
      profile_name: result.profile_name,
      ai_context: result.ai_context,
      judgement_signature: String(Date.now()),
      previous_judgement_signature: null,
    });
  };

  const resetAssistantComment = useCallback(() => {
    badPostureStartRef.current = null;
    setAssistantComment(null);
    setAssistantError(null);
  }, []);

  return {
    assistantComment,
    assistantError,
    isAssistantCommentPending,
    handleAnalyzeResult,
    resetAssistantComment,
  };
}
