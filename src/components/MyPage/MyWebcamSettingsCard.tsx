import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWebcamSettings,
  updateWebcamSettings,
  type PostureSensitivity,
  type AiCommentThresholdSec,
  type AiCommentMode,
  type WebcamSettings,
} from "../../services/webcamSettingsApi";
import "../../styles/components/my-webcam-settings.scss";

const AI_COMMENT_MODE_OPTIONS: { value: AiCommentMode; label: string }[] = [
  { value: "ai", label: "AI 코멘트" },
  { value: "notification", label: "기본 알림" },
];

const AI_COMMENT_MODE_HINTS: Record<AiCommentMode, string> = {
  ai: "자세 이상이 지속되면 AI가 맞춤 코멘트를 작성해요",
  notification: "AI 없이 원인 항목을 알림으로 바로 전달해요",
};

const SENSITIVITY_OPTIONS: { value: PostureSensitivity; label: string }[] = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
];

const SENSITIVITY_HINTS: Record<PostureSensitivity, string> = {
  low: "기준 완화 — 많이 흐트러질 때만 경고, AI 코멘트 기회 적음",
  medium: "기본 판정 기준",
  high: "미세한 흐트러짐도 감지 — AI 코멘트 기회 많음",
};

const THRESHOLD_OPTIONS: { value: AiCommentThresholdSec; label: string }[] = [
  { value: 30, label: "30초" },
  { value: 60, label: "1분" },
  { value: 180, label: "3분" },
  { value: 300, label: "5분" },
];

const THRESHOLD_HINTS: Record<AiCommentThresholdSec, string> = {
  30: "경고 자세가 30초 연속 유지되면 발동",
  60: "경고 자세가 1분 연속 유지되면 발동",
  180: "경고 자세가 3분 연속 유지되면 발동",
  300: "경고 자세가 5분 연속 유지되면 발동",
};

export default function MyWebcamSettingsCard() {
  const queryClient = useQueryClient();

  const { data: serverData, isLoading } = useQuery({
    queryKey: ["webcam-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: getWebcamSettings,
  });

  const [draft, setDraft] = useState<WebcamSettings>({
    posture_sensitivity: "medium",
    ai_comment_threshold_sec: 60,
    ai_comment_mode: "ai",
  });

  useEffect(() => {
    if (serverData) setDraft(serverData);
  }, [serverData]);

  const isDirty =
    serverData !== undefined &&
    (draft.posture_sensitivity !== serverData.posture_sensitivity ||
      draft.ai_comment_threshold_sec !== serverData.ai_comment_threshold_sec ||
      draft.ai_comment_mode !== serverData.ai_comment_mode);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: updateWebcamSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["webcam-settings"], updated);
    },
  });

  return (
    <section className="card">
      <p className="mp-kicker">Webcam Analysis</p>
      <h3 className="mp-stats-title">웹캠 자세 분석 설정</h3>

      {isLoading ? (
        <p className="mp-webcam-settings__loading">불러오는 중…</p>
      ) : (
        <ul className="mp-pref-list">
          <li className="mp-pref-row">
            <div className="mp-pref-label-group">
              <span className="mp-pref-label">알림 방식</span>
              <span className="mp-pref-sublabel">{AI_COMMENT_MODE_HINTS[draft.ai_comment_mode]}</span>
            </div>
            <div className="mp-wcam-seg" role="group" aria-label="알림 방식 선택">
              {AI_COMMENT_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`mp-wcam-seg__btn${draft.ai_comment_mode === opt.value ? " is-active" : ""}`}
                  onClick={() => setDraft((prev) => ({ ...prev, ai_comment_mode: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>

          <li className="mp-pref-row">
            <div className="mp-pref-label-group">
              <span className="mp-pref-label">자세 민감도</span>
              <span className="mp-pref-sublabel">{SENSITIVITY_HINTS[draft.posture_sensitivity]}</span>
            </div>
            <div className="mp-wcam-seg" role="group" aria-label="자세 민감도 선택">
              {SENSITIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`mp-wcam-seg__btn${draft.posture_sensitivity === opt.value ? " is-active" : ""}`}
                  onClick={() => setDraft((prev) => ({ ...prev, posture_sensitivity: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>

          <li className="mp-pref-row">
            <div className="mp-pref-label-group">
              <span className="mp-pref-label">AI 코멘트 발동</span>
              <span className="mp-pref-sublabel">{THRESHOLD_HINTS[draft.ai_comment_threshold_sec]}</span>
            </div>
            <div className="mp-wcam-seg" role="group" aria-label="AI 코멘트 발동 시간 선택">
              {THRESHOLD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`mp-wcam-seg__btn${draft.ai_comment_threshold_sec === opt.value ? " is-active" : ""}`}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, ai_comment_threshold_sec: opt.value }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </li>

          <li className="mp-pref-row mp-pref-row--save">
            <button
              type="button"
              className="mp-pref-download"
              disabled={!isDirty || isPending}
              onClick={() => saveSettings(draft)}
            >
              {isPending ? "저장 중…" : "저장"}
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
