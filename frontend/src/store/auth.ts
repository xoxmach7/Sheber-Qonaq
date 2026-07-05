import { create } from 'zustand'
import { authApi } from '../api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // Стал ли известен реальный профиль пользователя (роль и т.д.) после
  // перезагрузки страницы. При F5 user сбрасывается в null, пока идёт
  // повторный /users/me/ — страницы с гейтом по роли (Финансы, Сотрудники)
  // не должны показывать «Раздел недоступен» в это окно, только пока
  // профиль ещё не подтверждён.
  isInitialized: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  isInitialized: !localStorage.getItem('access_token'),

  login: async (username, password) => {
    set({ isLoading: true })
    try {
      const tokens = await authApi.login({ username, password })
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      const user = await authApi.me()
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token')
    if (refresh) {
      try { await authApi.logout(refresh) } catch { /* ignore */ }
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { set({ isInitialized: true }); return }
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true, isInitialized: true })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, isAuthenticated: false, isInitialized: true })
    }
  },
}))
