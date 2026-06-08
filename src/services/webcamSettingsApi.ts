import apiClient from "./api";

export type PostureSensitivity = "low" | "medium" | "high";
export type AiCommentThresholdSec = 30 | 60 | 180 | 300;

export interface WebcamSettings {
  posture_sensitivity: PostureSensitivity;
  ai_comment_threshold_sec: AiCommentThresholdSec;
}

export const getWebcamSettings = async (): Promise<WebcamSettings> => {
  const response = await apiClient.get<WebcamSettings>("/webcam/settings");
  return response.data;
};

export const updateWebcamSettings = async (
  data: Partial<WebcamSettings>,
): Promise<WebcamSettings> => {
  const response = await apiClient.patch<WebcamSettings>("/webcam/settings", data);
  return response.data;
};
