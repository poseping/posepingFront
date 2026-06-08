import apiClient from "./api";

export interface UserApiSettings {
  is_ai_enabled: boolean;
  ai_api_key_masked: string | null;
}

export interface UserApiSettingsUpdate {
  is_ai_enabled?: boolean;
  ai_api_key?: string; // 빈 문자열 "" 전송 시 키 삭제
}

export const getUserApiSettings = async (): Promise<UserApiSettings> => {
  const response = await apiClient.get<UserApiSettings>("/user/api-settings");
  return response.data;
};

export const updateUserApiSettings = async (
  data: UserApiSettingsUpdate,
): Promise<UserApiSettings> => {
  const response = await apiClient.patch<UserApiSettings>("/user/api-settings", data);
  return response.data;
};
