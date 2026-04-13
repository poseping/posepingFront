/**
 * Redux Toolkit - 인증 상태 관리
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { UserInfo } from "../services/authService"

interface AuthState {
  user: UserInfo | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // 로그인 시작
    loginStart(state) {
      state.loading = true
      state.error = null
    },

    // 로그인 성공
    loginSuccess(state, action: PayloadAction<{ user: UserInfo; token: string }>) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.loading = false
      state.error = null
    },

    // 로그인 실패
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
      state.isAuthenticated = false
    },

    // 로그아웃
    logout(state) {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
    },

    // 토큰 설정 (앱 시작 시)
    setToken(state, action: PayloadAction<{ user: UserInfo; token: string }>) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
    },

    // 에러 클리어
    clearError(state) {
      state.error = null
    },
  },
})

export const { loginStart, loginSuccess, loginFailure, logout, setToken, clearError } = authSlice.actions
export default authSlice.reducer
