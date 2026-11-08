import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuth from '../context/useAuth'
import { getDashboardPath } from '../utils/dashboardPath'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { user, login } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return (
      <Navigate
      to={user.isFirstLogin ? '/change-password' : getDashboardPath(user)}
        replace
      />
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    try {
      const loggedInUser = await login(email, password)
      toast.success(`Welcome, ${loggedInUser.name}.`)
      navigate(
        loggedInUser.isFirstLogin
          ? '/change-password'
          : getDashboardPath(loggedInUser),
        { replace: true },
      )
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to log in.'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
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
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your university account
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-xs text-slate-500">
          Secure access for RBPU University
        </p>
      </form>
    </main>
  )
}

export default LoginPage
