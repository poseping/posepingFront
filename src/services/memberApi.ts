import apiClient from "./api";
import type { UserInfo } from "./authService";

export const getRandomNickname = async (): Promise<{ nickname: string }> => {
  const response = await apiClient.get<{ nickname: string }>(
    "/auth/me/random-nickname",
  );
  return response.data;
};

export const updateNickname = async (nickname: string): Promise<UserInfo> => {
  const response = await apiClient.patch<UserInfo>("/auth/me", { nickname });
  return response.data;
};

export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete("/auth/me");
};

export interface LifestyleHabit {
  sitting_hours_per_day: string | null;
  exercise_days_per_week: string | null;
  pain_areas: string | null;
  sleep_position: string | null;
  updated_at: string | null;
}

export const getLifestyleHabits = async (): Promise<LifestyleHabit | null> => {
  try {
    const response = await apiClient.get<LifestyleHabit>(
      "/assistant/lifestyle",
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};
