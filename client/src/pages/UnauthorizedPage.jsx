import { Link } from 'react-router-dom'

function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Access denied</h1>
      <p className="text-slate-600">Your account does not have permission to view this page.</p>
      <Link className="font-semibold text-blue-700 hover:underline" to="/dashboard">
        Return to dashboard
      </Link>
    </main>
  )
}

export default UnauthorizedPage
