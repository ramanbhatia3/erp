import axios from 'axios'

export const TOKEN_KEY = 'token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

// Attach the saved token to requests that need authentication.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function getHealth(signal) {
  return api.get('/health', { signal })
}

export default api
