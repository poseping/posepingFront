import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWebcamSettings,
  updateWebcamSettings,
  type PostureSensitivity,
  type AiCommentThresholdSec,
  type WebcamSettings,
} from "../../services/webcamSettingsApi";
import "../../styles/components/my-webcam-settings.scss";

const SENSITIVITY_OPTIONS: { value: PostureSensitivity; label: string }[] = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
];

const THRESHOLD_OPTIONS: { value: AiCommentThresholdSec; label: string }[] = [
  { value: 30, label: "30초" },
  { value: 60, label: "1분" },
  { value: 180, label: "3분" },
  { value: 300, label: "5분" },
];

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
  });

  useEffect(() => {
    if (serverData) setDraft(serverData);
  }, [serverData]);

  const isDirty =
    serverData !== undefined &&
    (draft.posture_sensitivity !== serverData.posture_sensitivity ||
      draft.ai_comment_threshold_sec !== serverData.ai_comment_threshold_sec);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: updateWebcamSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["webcam-settings"], updated);
    },
  });

  return (
    <section className="card">
      <p className="mp-kicker">Webcam Analysis</p>
      <h3 className="mp-stats-title">자세 분석 설정</h3>

      {isLoading ? (
        <p className="mp-webcam-settings__loading">불러오는 중…</p>
      ) : (
        <ul className="mp-pref-list">
          <li className="mp-pref-row">
            <div className="mp-pref-label-group">
              <span className="mp-pref-label">자세 민감도</span>
              <span className="mp-pref-sublabel">높을수록 미세한 흐트러짐도 경고</span>
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
              <span className="mp-pref-sublabel">나쁜 자세가 이 시간 지속되면 AI가 코멘트</span>
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
              className="btn btn--primary btn--sm"
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
