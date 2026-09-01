import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kaushalai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !isRefreshing) {
      isRefreshing = true
      try {
        const { data } = await apiClient.post('/auth/refresh')
        localStorage.setItem('kaushalai_token', data.accessToken)
        error.config.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(error.config)
      } catch {
        localStorage.removeItem('kaushalai_token')
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
