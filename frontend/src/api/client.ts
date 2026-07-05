import axios from 'axios'
import { showToast } from '../lib/toast'

// Dev: относительный URL → vite proxy → localhost:8000
// Production: полный URL бэкенда Railway (VITE_API_URL задаётся в Railway)
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обновление access-токена — только один сетевой запрос за раз.
//
// Why: SIMPLE_JWT настроен на ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION —
// каждый успешный /auth/refresh/ мгновенно инвалидирует старый refresh token.
// Когда access-токен истекает, приложение обычно шлёт НЕСКОЛЬКО параллельных
// запросов (дашборд/карта грузят сразу 3-5 эндпоинтов) — без этого замка
// каждый из них ловил 401 и независимо дёргал /auth/refresh/ с одним и тем же
// (уже использованным и заблэклистенным вторым запросом) refresh token, что
// приводило к ложному разлогину каждые ~10-15 минут, хотя первый запрос
// сессию уже успешно продлил.
let refreshPromise: Promise<string> | null = null

function refreshAccessToken(refresh: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshURL = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/v1/auth/refresh/`
        : '/api/v1/auth/refresh/'
      const { data } = await axios.post(refreshURL, { refresh })
      localStorage.setItem('access_token', data.access)
      return data.access
    })().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const access = await refreshAccessToken(refresh)
          original.headers.Authorization = `Bearer ${access}`
          return api(original)
        } catch (refreshError) {
          // Показываем причину разлогина
          if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
            showToast('Сессия истекла. Войдите снова')
          } else {
            showToast('Ошибка соединения. Попробуйте позже')
          }
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          // Небольшая задержка, чтобы пользователь увидел уведомление
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000)
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
