import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api, { setUnauthorizedHandler, TOKEN_KEY } from '../services/api'
import AuthContext from './authContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  )
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    return setUnauthorizedHandler(() => {
      if (userRef.current) {
        userRef.current = null
        setUser(null)
        toast.error('Your session has expired. Please log in again.', {
          id: 'session-expired',
        })
      }
    })
  }, [])

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
          userRef.current = response.data.user
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
    userRef.current = response.data.user
    setUser(response.data.user)
    return response.data.user
  }

  async function changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    userRef.current = response.data.user
    setUser(response.data.user)
    return response.data.user
  }

  async function updateStudentProfile(studentProfile) {
    const response = await api.patch('/auth/profile', { studentProfile })
    userRef.current = response.data.user
    setUser(response.data.user)
    return response.data.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    userRef.current = null
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, changePassword, updateStudentProfile, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}
