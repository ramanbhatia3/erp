import { useEffect } from 'react'
import { Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'motion/react'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import LoginPage from './pages/LoginPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import useAuth from './context/useAuth'
import { dashboardRoles, getDashboardPath } from './utils/dashboardPath'

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    const contentEl = document.querySelector('.content-scroll')
    if (contentEl) {
      contentEl.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname, search])
  return null
}

function App() {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
      <ScrollToTop />
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute allowedRoles={['superadmin']} allowFirstLogin>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:role/*"
          element={
            <ProtectedRoute allowedRoles={dashboardRoles}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={dashboardRoles}>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </MotionConfig>
  )
}

function DashboardRedirect() {
  const { user } = useAuth()

  return <Navigate to={getDashboardPath(user)} replace />
}

export default App
