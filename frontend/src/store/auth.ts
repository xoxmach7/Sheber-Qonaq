import { create } from 'zustand'
import { authApi } from '../api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true })
    try {
      const tokens = await authApi.login({ username, password })
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      const user = await authApi.me()
      set({ user, isAuthenticated: true, isLoading: false })
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
    if (!token) return
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, isAuthenticated: false })
    }
  },
}))
