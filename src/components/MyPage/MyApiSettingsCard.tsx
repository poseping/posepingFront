import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserApiSettings,
  updateUserApiSettings,
} from "../../services/userApiSettingsApi";

export default function MyApiSettingsCard() {
  const queryClient = useQueryClient();
  const [keyInput, setKeyInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-api-settings"],
    queryFn: getUserApiSettings,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: update, isPending } = useMutation({
    mutationFn: updateUserApiSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["user-api-settings"], updated);
      setKeyInput("");
      setShowInput(false);
    },
  });

  const hasKey = !!data?.ai_api_key_masked;
  const isAiEnabled = data?.is_ai_enabled ?? false;

  const handleSaveKey = () => {
    if (!keyInput.trim()) return;
    update({ ai_api_key: keyInput.trim() });
  };

  const handleDeleteKey = () => {
    update({ ai_api_key: "" });
  };

  const handleToggleAi = () => {
    update({ is_ai_enabled: !isAiEnabled });
  };

  return (
    <section className="card">
      <p className="mp-kicker">AI Settings</p>
      <h3 className="mp-stats-title">AI 설정</h3>

      {isLoading ? (
        <p className="mp-webcam-settings__loading">불러오는 중…</p>
      ) : (
        <ul className="mp-pref-list">
          <li className="mp-pref-row">
            <div className="mp-pref-label-group">
              <span className="mp-pref-label">AI 모드</span>
              <span className="mp-pref-sublabel">
                {isAiEnabled
                  ? "AI 코멘트가 활성화되어 있어요"
                  : hasKey
                  ? "AI 모드가 꺼져 있어요"
                  : "API 키를 등록하면 AI 모드를 켤 수 있어요"}
              </span>
            </div>
            <button
              type="button"
              className={`mp-wcam-seg__btn${isAiEnabled ? " is-active" : ""}`}
              disabled={!hasKey || isPending}
              onClick={handleToggleAi}
            >
              {isAiEnabled ? "활성" : "비활성"}
            </button>
          </li>

          <li className="mp-pref-row">
            <div className="mp-pref-label-group">
              <span className="mp-pref-label">AI API 키</span>
              <span className="mp-pref-sublabel">
                {hasKey
                  ? data.ai_api_key_masked
                  : "미등록 — Google AI Studio에서 무료로 발급받을 수 있어요"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {hasKey && (
                <button
                  type="button"
                  className="mp-pref-download"
                  disabled={isPending}
                  onClick={handleDeleteKey}
                >
                  삭제
                </button>
              )}
              <button
                type="button"
                className="mp-pref-download"
                onClick={() => setShowInput((v) => !v)}
              >
                {hasKey ? "변경" : "등록"}
              </button>
            </div>
          </li>

          {showInput && (
            <li className="mp-pref-row">
              <input
                type="password"
                placeholder="API 키를 입력하세요"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color, #ddd)" }}
              />
              <button
                type="button"
                className="mp-pref-download"
                disabled={!keyInput.trim() || isPending}
                onClick={handleSaveKey}
                style={{ marginLeft: "8px" }}
              >
                {isPending ? "저장 중…" : "저장"}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
