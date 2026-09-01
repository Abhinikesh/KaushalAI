import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT from store/localStorage on every outgoing request.
// The token management logic will be added in the auth stage.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kaushalai_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling (toast notifications, 401 redirect, etc.)
    // will be wired up in the auth stage.
    return Promise.reject(error)
  }
)

export default apiClient
