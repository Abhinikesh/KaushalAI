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

let _getToken       = () => null
let _clearAuth      = () => {}
let _setAuth        = () => {}
let _getSessionGen  = () => null

/** Called once by authStore to wire up the token getter and auth callbacks */
export function configureApiClient({ getToken, clearAuth, setAuth, getSessionGen }) {
  _getToken      = getToken
  _clearAuth     = clearAuth
  _setAuth       = setAuth
  _getSessionGen = getSessionGen || (() => null)
}

const apiClient = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 30000,
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

// Cross-tab token refresh coordination using native BroadcastChannel
const AUTH_CHANNEL_NAME = 'kaushalai_auth_sync'
let authChannel = null

export function broadcastAuthEvent(eventPayload) {
  try {
    if (authChannel && typeof eventPayload === 'object' && eventPayload !== null) {
      authChannel.postMessage({
        timestamp: Date.now(),
        sessionGen: _getSessionGen(),
        ...eventPayload,
      })
    }
  } catch {
    // BroadcastChannel error ignored
  }
}

export function handleAuthChannelMessage(data, { currentGen = _getSessionGen(), currentToken = _getToken() } = {}) {
  if (!data || typeof data !== 'object') return false

  const { type, token, user, timestamp, sessionGen } = data

  // Discard malformed session generation values
  if (!sessionGen || typeof sessionGen !== 'string' || sessionGen.trim() === '') {
    return false
  }

  // Discard stale messages older than 10 seconds
  if (timestamp && Date.now() - timestamp > 10000) return false

  // Reject out-of-order or cross-session messages:
  // If tab has an active session generation, incoming message must match currentGen exactly.
  if (currentGen && sessionGen !== currentGen) {
    return false
  }

  if (type === 'AUTH_LOGOUT') {
    _clearAuth()
    processQueue(new Error('User logged out from another tab'), null)
    isRefreshing = false
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/signup' &&
      window.location.pathname !== '/forgot-password'
    ) {
      window.location.replace('/login')
    }
    return true
  }

  // If this tab is currently unauthenticated (logged out), a background refresh message must not revive it
  if (!currentToken) {
    return false
  }

  if (type === 'REFRESH_SUCCESS') {
    // Validate access token format (must be non-empty JWT string, 3 dot-separated parts)
    if (typeof token === 'string' && token.split('.').length === 3) {
      _setAuth(user, token)
      processQueue(null, token)
      isRefreshing = false
      return true
    }
    return false
  } else if (type === 'REFRESH_FAILURE') {
    processQueue(new Error('Cross-tab refresh failed'), null)
    isRefreshing = false
    return true
  }

  return false
}

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    authChannel.onmessage = (event) => {
      handleAuthChannelMessage(event?.data)
    }
  } catch {
    authChannel = null
  }
}

// Fallback / complementary cross-tab synchronization via storage events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'kaushalai_token' && !e.newValue) {
      _clearAuth()
      processQueue(new Error('User logged out from another tab'), null)
      isRefreshing = false
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/signup' &&
        window.location.pathname !== '/forgot-password'
      ) {
        window.location.replace('/login')
      }
    }
  })
}

const processQueue = (error, token) => {
  pendingQueue.forEach((p) => {
    if (p.timer) clearTimeout(p.timer)
    if (error) {
      p.reject(error)
    } else {
      p.resolve(token)
    }
  })
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config || {}

    // Do not attempt to refresh if the failed request was already /auth/refresh, /auth/login, /auth/signup or already retried
    if (
      error.response?.status !== 401 ||
      original._retried ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/signup') ||
      original.url?.includes('/auth/sso')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        let timer = null
        timer = setTimeout(() => {
          // Safety timeout: remove from queue after 5 seconds to prevent hung tabs
          const idx = pendingQueue.findIndex((p) => p.timer === timer)
          if (idx !== -1) {
            pendingQueue.splice(idx, 1)
          }
          reject(new Error('Authentication refresh timed out'))
        }, 5000)

        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(original))
          },
          reject,
          timer,
        })
      })
    }

    original._retried = true
    isRefreshing = true
    broadcastAuthEvent({ type: 'REFRESH_START' })

    try {
      const { data } = await apiClient.post('/auth/refresh')
      const newToken = data.accessToken
      _setAuth(data.user, newToken)
      processQueue(null, newToken)
      broadcastAuthEvent({ type: 'REFRESH_SUCCESS', token: newToken, user: data.user })
      original.headers.Authorization = `Bearer ${newToken}`
      return apiClient(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      broadcastAuthEvent({ type: 'REFRESH_FAILURE' })
      _clearAuth()
      // Only redirect if not already on an authentication page to prevent infinite reload loops
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/signup' &&
        window.location.pathname !== '/forgot-password'
      ) {
        window.location.replace('/login')
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
