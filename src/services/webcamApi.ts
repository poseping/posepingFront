import apiClient from "./api";
import type { Landmark } from "./api";

export type { Landmark };

export interface PostureProfile {
  profile_id: number;
  member_id: number;
  profile_name: string;
  monitor_label: string | null;
  display_order: number;
  description: string | null;
  reference_landmarks: object;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebcamAnalyzeResponse {
  status: "good" | "warning" | "bad";
  deviation_score: number;
  profile_id: number;
  profile_name: string;
  issues: string[];
  per_point: Record<string, number>;
  landmarks: Landmark[];
  frame_width: number;
  frame_height: number;
  ai_context?: Record<string, unknown>;
  judgement_signature?: string;
}

export const getPostureProfiles = async (): Promise<PostureProfile[]> => {
  const response = await apiClient.get<PostureProfile[]>(
    "/webcam/posture-profile",
  );
  return response.data;
};

export const registerPostureProfile = async (
  landmarks: Landmark[],
  profileName = "기본 자세",
): Promise<PostureProfile> => {
  const response = await apiClient.post<PostureProfile>(
    "/webcam/posture-profile",
    {
      reference_landmarks: landmarks,
      profile_name: profileName,
    },
  );
  return response.data;
};

export const updatePostureProfile = async (
  profileId: number,
  data: {
    profile_name?: string;
    monitor_label?: string;
    description?: string;
    is_active?: boolean;
  },
): Promise<PostureProfile> => {
  const response = await apiClient.patch<PostureProfile>(
    `/webcam/posture-profile/${profileId}`,
    data,
  );
  return response.data;
};

export const deletePostureProfile = async (
  profileId: number,
): Promise<void> => {
  await apiClient.delete(`/webcam/posture-profile/${profileId}`);
};

export const analyzeWebcam = async (
  imageBase64: string,
  profileId?: number,
  sensitivity: "low" | "medium" | "high" = "medium",
): Promise<WebcamAnalyzeResponse> => {
  const response = await apiClient.post<WebcamAnalyzeResponse>(
    "/webcam/analyze",
    {
      image_base64: imageBase64,
      profile_id: profileId ?? null,
      sensitivity,
    },
  );
  return response.data;
};

export interface AlertType {
  alert_type_id: string;
  alert_name: string;
  description: string | null;
}

export const getAlertTypes = async (): Promise<AlertType[]> => {
  const response = await apiClient.get<AlertType[]>("/webcam/alert-types");
  return response.data;
};

export interface WebcamSessionRequest {
  started_at: string;
  ended_at: string;
  good_frames: number;
  warning_frames: number;
  bad_frames: number;
  cause_counts: Record<string, number>;
}

export const saveWebcamSession = async (
  data: WebcamSessionRequest,
): Promise<void> => {
  await apiClient.post("/webcam/session", data);
};

export const deleteWebcamSession = async (sessionId: number): Promise<void> => {
  await apiClient.delete(`/webcam/session/${sessionId}`);
};

export interface WebcamSessionHistoryItem {
  session_id: number;
  started_at: string;
  ended_at: string | null;
  good_frames: number;
  warning_frames: number;
  bad_frames: number;
  total_frames: number;
  good_ratio: number;
  cause_counts: Record<string, number> | null;
}

export interface WebcamHistoryResponse {
  sessions: WebcamSessionHistoryItem[];
  total: number;
}

export type HistoryPeriod = "day" | "week" | "month";

export const getWebcamHistory = async (
  options: { period: HistoryPeriod } | { limit?: number } = {},
): Promise<WebcamHistoryResponse> => {
  const response = await apiClient.get<WebcamHistoryResponse>(
    "/webcam/history",
    { params: options },
  );
  return response.data;
};
