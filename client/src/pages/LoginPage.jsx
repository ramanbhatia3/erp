import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import toast from 'react-hot-toast'
import campusImage from '../assets/rbpu.jpg'
import universityLogo from '../assets/rbpulogo.webp'
import useAuth from '../context/useAuth'
import { getDashboardPath } from '../utils/dashboardPath'

function LoginPage() {
  const [accountType, setAccountType] = useState('staff')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { user, login } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return (
      <Navigate
      to={user.role === 'superadmin' && user.isFirstLogin ? '/change-password' : getDashboardPath(user)}
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
        loggedInUser.role === 'superadmin' && loggedInUser.isFirstLogin
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

  const isStudent = accountType === 'student'

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#edf0f4] p-3 sm:p-4">
      <motion.div
        className="login-frame grid w-full max-w-[76rem] overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_72px_rgba(15,23,42,0.13)] md:grid-cols-[1.08fr_0.92fr]"
        initial={{ opacity: 0, y: 14, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <aside className="login-campus relative min-h-40 overflow-hidden sm:min-h-52 md:min-h-0">
          <img
            alt="Rayat Bahra Professional University campus"
            className="absolute inset-0 h-full w-full object-cover object-center"
            src={campusImage}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
              {isStudent ? 'Student access' : 'Faculty & administration'}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {isStudent ? 'Your campus, closer.' : 'Your university, in sync.'}
            </h2>
          </div>
        </aside>

        <form className="login-form flex flex-col justify-center p-6 sm:p-8 lg:p-10" onSubmit={handleSubmit}>
          <div className="login-heading mb-5">
            <div className="mb-5 inline-flex rounded-xl bg-[#171b20] px-3 py-2">
              <img
                alt="Rayat Bahra Professional University"
                className="h-7 w-auto object-contain"
                src={universityLogo}
              />
            </div>
            <div
              aria-label="Choose account type"
              className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
              role="group"
            >
              <button
                aria-pressed={isStudent}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isStudent ? 'bg-[#171b20] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setAccountType('student')}
                type="button"
              >
                Student
              </button>
              <button
                aria-pressed={!isStudent}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  !isStudent ? 'bg-[#171b20] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setAccountType('staff')}
                type="button"
              >
                Staff / Faculty
              </button>
            </div>
            <p className={`text-sm font-semibold ${isStudent ? 'text-emerald-700' : 'text-blue-700'}`}>
              {isStudent ? 'Student portal' : 'Staff and faculty portal'}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {isStudent ? 'Welcome back' : 'Sign in to your account'}
            </h1>
            <p className="mt-1.5 text-sm leading-5 text-slate-500">
              {isStudent
                ? 'Check your classes, attendance, and results.'
                : 'Access your teaching and university workspace.'}
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              University email
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type="email"
                autoComplete="email"
                placeholder={isStudent ? 'student@rbpu.in' : 'name@rbpu.in'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>
          {errorMessage && (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <motion.button
            className="mt-4 w-full rounded-xl bg-[#171b20] px-4 py-3 font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-[#292e32] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
          >
            {submitting ? 'Signing in…' : isStudent ? 'Sign in as student' : 'Sign in'}
          </motion.button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Use the email and password registered to your account.
          </p>
        </form>
      </motion.div>
    </main>
  )
}

export default LoginPage
