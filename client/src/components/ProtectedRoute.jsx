import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth'
import { getDashboardPath, getDashboardRole } from '../utils/dashboardPath'

function ProtectedRoute({ children, allowedRoles = [], allowFirstLogin = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-600">
        Loading your account...
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.isFirstLogin && !allowFirstLogin) {
    return <Navigate to="/change-password" replace />
  }

  if (!user.isFirstLogin && allowFirstLogin) {
    return <Navigate to={getDashboardPath(user)} replace />
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(getDashboardRole(user))
  ) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute
