/**
 * 인증 서비스
 * JWT 토큰 로컬스토리지 관리
 */

const TOKEN_KEY = "access_token"
const USER_KEY = "user_info"
const FIRST_LOGIN_CHOICE_PENDING_PREFIX = "first_login_choice_pending"

export interface UserInfo {
  member_id?: number
  member_no?: number
  provider: string
  nickname?: string
  profile_image_url?: string
  role: string
  is_new_member?: boolean
}

export interface LoginResponse {
  success: boolean
  access_token: string
  token_type: string
  expires_in: number
  user: UserInfo
  is_new_member?: boolean
}

/**
 * 토큰을 로컬스토리지에 저장
 */
export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 로컬스토리지에서 토큰 조회
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 사용자 정보 로컬스토리지에 저장
 */
export const saveUserInfo = (user: UserInfo): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * 로컬스토리지에서 사용자 정보 조회
 */
export const getUserInfo = (): UserInfo | null => {
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

/**
 * 토큰과 사용자 정보 삭제
 */
export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * 토큰이 존재하는지 확인
 */
export const isAuthenticated = (): boolean => {
  return !!getToken()
}

const getFirstLoginChoicePendingKey = (user: UserInfo): string => {
  const userId = user.member_id ?? user.member_no ?? user.nickname ?? user.provider
  return `${FIRST_LOGIN_CHOICE_PENDING_PREFIX}:${user.provider}:${userId}`
}

export const hasPendingFirstLoginChoice = (user: UserInfo | null): boolean => {
  if (!user) return false
  return sessionStorage.getItem(getFirstLoginChoicePendingKey(user)) === "true"
}

export const markFirstLoginChoicePending = (user: UserInfo): void => {
  sessionStorage.setItem(getFirstLoginChoicePendingKey(user), "true")
}

export const markFirstLoginChoiceSeen = (user: UserInfo): void => {
  sessionStorage.removeItem(getFirstLoginChoicePendingKey(user))
}

export const getPostLoginPath = (user: UserInfo, loginResponse?: LoginResponse): string => {
  if (user.role?.toLowerCase() === "admin") {
    return "/admin"
  }

  if (loginResponse?.is_new_member === true) {
    markFirstLoginChoicePending(user)
    return "/first-login"
  }

  markFirstLoginChoiceSeen(user)
  return "/home"
}
