import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'

function StudentDashboard({ user }) {
  const [attendance, setAttendance] = useState(null)

  useEffect(() => {
    let active = true
    api.get('/attendance/student/me')
      .then((response) => {
        if (active) setAttendance(response.data)
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error.response?.data?.message || 'Unable to load attendance summary.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {user.name}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="My Subjects" value="—" />
        <StatCard
          label="Attendance"
          value={attendance ? `${attendance.overall.percentage}%` : '—'}
          detail={
            attendance
              ? `${attendance.overall.present} of ${attendance.overall.total} lectures`
              : undefined
          }
        />
        <StatCard label="Results" value="—" />
      </div>
      {attendance?.shortage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
          role="alert"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Attendance shortage alert</p>
              <p className="mt-1 text-sm">
                {attendance.overallBelowThreshold
                  ? `Your overall attendance is below ${attendance.attendanceThreshold}%.`
                  : `Your attendance is below ${attendance.attendanceThreshold}% in ${attendance.shortageSubjects.length} subject(s).`}
              </p>
              {attendance.shortageSubjects.length > 0 && (
                <p className="mt-1 text-sm">
                  {attendance.shortageSubjects
                    .map((item) => `${item.subject?.name || 'Subject'} (${item.percentage}%)`)
                    .join(', ')}
                </p>
              )}
            </div>
            <Link
              className="shrink-0 rounded-lg bg-red-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-red-800"
              to="/dashboard/student/attendance"
            >
              View attendance
            </Link>
          </div>
        </div>
      )}
      <Card>
        <EmptyState
          title="Your student overview is ready"
          message="Your timetable, attendance, results, and notices will appear here."
        />
      </Card>
    </div>
  )
}

export default StudentDashboard
