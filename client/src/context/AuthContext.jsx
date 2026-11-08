import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api, { TOKEN_KEY } from '../services/api'
import AuthContext from './authContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  )

  useEffect(() => {
    let active = true
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      return undefined
    }

    async function loadUser() {
      try {
        const response = await api.get('/auth/me')
        if (active) {
          setUser(response.data.user)
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
        } else {
          toast.error('Unable to verify your session. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    localStorage.setItem(TOKEN_KEY, response.data.token)
    setUser(response.data.user)
    return response.data.user
  }

  async function changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    setUser(response.data.user)
    return response.data.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, changePassword, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}
