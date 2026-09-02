import axios from 'axios'

/**
 * Singleton axios instance.
 *
 * Circular dependency fix:
 *   authStore → api/client → (used to import) authStore  ← crash
 *
 * Solution: instead of importing useAuthStore here, we expose a `setTokenGetter`
 * function. authStore calls this once on init to register a getter for the
 * current access token, so client.js never imports authStore directly.
 */

let _getToken    = () => null
let _clearAuth   = () => {}
let _setAuth     = () => {}

/** Called once by authStore to wire up the token getter and auth callbacks */
export function configureApiClient({ getToken, clearAuth, setAuth }) {
  _getToken  = getToken
  _clearAuth = clearAuth
  _setAuth   = setAuth
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ──────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = _getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: silent token refresh on 401 ─────────────────────────
let isRefreshing = false
let pendingQueue = []

const processQueue = (error, token) => {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
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
      _setAuth(data.user, newToken)
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return apiClient(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      _clearAuth()
      window.location.replace('/login')
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
