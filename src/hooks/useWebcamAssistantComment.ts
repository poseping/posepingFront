import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getAssistantErrorMessage,
  getWebcamComment,
} from "../services/assistantApi";
import type { AiCommentMode } from "../services/webcamSettingsApi";

const supportsNotification = typeof Notification !== "undefined";

function buildFallbackMessage(issues: string[], getIssueName: (id: string) => string): string {
  if (issues.length === 0) return "자세를 바르게 해주세요."
  const labels = issues.map(getIssueName).filter(Boolean)
  return `${labels.join(", ")} — 자세를 바르게 해주세요.`
}

export interface WebcamAssistantAnalyzeInput {
  status: string;
  deviation_score: number;
  issues: string[];
  profile_name: string;
  ai_context?: Record<string, unknown>;
  judgement_signature?: string;
}

export function useWebcamAssistantComment(
  isSessionActive: boolean,
  thresholdSec: number = 60,
  aiMode: AiCommentMode = "ai",
  getIssueName: (id: string) => string = (id) => id,
) {
  const thresholdMsRef = useRef(thresholdSec * 1000);
  useEffect(() => { thresholdMsRef.current = thresholdSec * 1000 }, [thresholdSec]);
  const badPostureStartRef = useRef<number | null>(null);
  const [assistantComment, setAssistantComment] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>(supportsNotification ? Notification.permission : 'denied')

  useEffect(() => {
    if (!supportsNotification) return
    if (Notification.permission === "default") {
      Notification.requestPermission().then(setNotifPermission);
    }
  }, []);

  const { mutate: requestWebcamComment, isPending: isAssistantCommentPending } =
    useMutation({
      mutationFn: getWebcamComment,
      onSuccess: (data) => {
        if (data.requested && data.comment) {
          setAssistantComment(data.comment);
          if (supportsNotification && Notification.permission === "granted" && document.hidden) {
            new Notification("포즈PING AI 코멘트", {
              body: data.comment,
              icon: "/favicon.ico",
            });
          }
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
    if (elapsed < thresholdMsRef.current) return;
    if (isAssistantCommentPending) return;

    badPostureStartRef.current = null;

    if (aiMode === "notification") {
      const message = buildFallbackMessage(result.issues, getIssueName);
      setAssistantComment(message);
      if (supportsNotification && Notification.permission === "granted" && document.hidden) {
        new Notification("포즈PING", { body: message, icon: "/favicon.ico" });
      }
      return;
    }

    requestWebcamComment({
      status: result.status,
      deviation_score: result.deviation_score,
      issues: result.issues,
      profile_name: result.profile_name,
      ai_context: result.ai_context,
      judgement_signature: result.judgement_signature ?? String(Date.now()),
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
    notifPermission,
    handleAnalyzeResult,
    resetAssistantComment,
  };
}
