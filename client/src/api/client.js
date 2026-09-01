import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,   // sends httpOnly refresh cookie automatically
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token from in-memory store ─────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: silent token refresh on 401 ─────────────────────────
let isRefreshing = false
let pendingQueue = []  // requests that arrived while refresh was in flight

const processQueue = (error, token) => {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Only attempt refresh on 401, and only once per request (flag _retried)
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(original))
          },
          reject,
        })
      })
    }

    original._retried = true
    isRefreshing = true

    try {
      const { data } = await apiClient.post('/auth/refresh')
      const newToken = data.accessToken
      useAuthStore.getState().setAuth(data.user, newToken)
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return apiClient(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      useAuthStore.getState().clearAuth()
      window.location.replace('/login')
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
