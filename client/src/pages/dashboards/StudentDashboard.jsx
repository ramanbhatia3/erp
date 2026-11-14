import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Loader from '../../components/ui/Loader'
import StatCard from '../../components/ui/StatCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function StudentDashboard({ user }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/attendance/student/me'),
      api.get('/marks/student/me'),
    ])
      .then(([attendanceResponse, marksResponse]) => {
        if (!active) return
        setSummary({
          attendance: attendanceResponse.data,
          marks: marksResponse.data.marks,
        })
        setError('')
      })
      .catch((requestError) => {
        if (active) {
          const message = requestError.response?.data?.message || 'Unable to load your attendance and marks.'
          setError(message)
          toast.error(message)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Student"
        user={user}
        subtitle="View your attendance and marks."
      />
      {loading ? (
        <Card><Loader label="Loading your academic summary..." /></Card>
      ) : error ? (
        <EmptyState title="Academic summary unavailable" message={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Attendance"
              value={`${summary.attendance.overall.percentage}%`}
              detail={`${summary.attendance.overall.present} present of ${summary.attendance.overall.total} classes`}
            />
            <StatCard label="Marks available" value={summary.marks.length} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">Attendance</h2>
                <p className="mt-1 text-sm text-slate-500">Review your subject attendance and history.</p>
              </div>
              <Link className="shrink-0 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800" to="/dashboard/student/attendance">
                View
              </Link>
            </Card>
            <Card className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">Marks</h2>
                <p className="mt-1 text-sm text-slate-500">Review your assignment and MST marks.</p>
              </div>
              <Link className="shrink-0 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800" to="/dashboard/student/results">
                View
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default StudentDashboard
