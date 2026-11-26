import axios from 'axios'

export const TOKEN_KEY = 'token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null
    }
  }
}

function isLoginRequest(config) {
  const url = String(config?.url || '').split('?')[0]
  return url === '/auth/login' || url === 'auth/login' || url.endsWith('/auth/login')
}

// Attach the saved token to requests that need authentication.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Clear expired or revoked credentials and trigger session cleanup on 401 responses.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isLoginRequest(error.config)) {
      localStorage.removeItem(TOKEN_KEY)

      if (unauthorizedHandler) {
        unauthorizedHandler()
      } else if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    return Promise.reject(error)
  },
)

export function getHealth(signal) {
  return api.get('/health', { signal })
}

export default api
