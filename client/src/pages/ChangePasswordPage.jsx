import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuth from '../context/useAuth'
import { getDashboardPath } from '../utils/dashboardPath'

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { user, changePassword, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.isFirstLogin) {
    return <Navigate to={getDashboardPath(user)} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (newPassword.length < 8) {
      setErrorMessage('Your new password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The new passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Your password has been changed.')
      navigate(getDashboardPath(user), { replace: true })
    } catch (error) {
      const message =
        error.response?.data?.message || 'Unable to change your password.'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() {
    logout()
    toast.success('You have been logged out.')
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <form
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-lg sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-lg font-bold text-white">
            RB
          </div>
          <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-blue-700">
            RBPU Hub
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Change your password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Set a new password to continue to your dashboard.
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Current password
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          New password
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Confirm new password
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        {errorMessage && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <button
          className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Updating password…' : 'Update password'}
        </button>
        <button
          className="w-full text-sm font-medium text-slate-600 hover:text-slate-900"
          type="button"
          onClick={handleLogout}
        >
          Log out
        </button>
      </form>
    </main>
  )
}

export default ChangePasswordPage
