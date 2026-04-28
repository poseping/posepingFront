import apiClient from './api'
import type { UserInfo } from './authService'

export const updateNickname = async (nickname: string): Promise<UserInfo> => {
  const response = await apiClient.patch<UserInfo>('/auth/me', { nickname })
  return response.data
}

export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete('/auth/me')
}
