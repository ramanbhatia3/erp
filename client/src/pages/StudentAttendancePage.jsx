import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Table from '../components/ui/Table'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load attendance.'
}

function getSemesterOrdinal(value) {
  const semester = Number(value)
  const lastTwoDigits = semester % 100
  const suffix =
    lastTwoDigits >= 11 && lastTwoDigits <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' }[semester % 10] || 'th')
  return `${semester}${suffix}`
}

function formatDate(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AttendanceMetric({ label, value, highlight = false }) {
  return (
    <Card className="min-h-36 shadow-[0_8px_24px_rgba(15,23,42,0.07)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-extrabold tracking-tight ${highlight ? 'text-emerald-500' : 'text-slate-950'}`}>
        {value}
      </p>
    </Card>
  )
}

function StudentAttendancePage() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState('all')
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    let active = true
    api.get('/attendance/student/me')
      .then((response) => {
        if (active) {
          setResult(response.data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          const message = getErrorMessage(requestError)
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

  const semesters = useMemo(() => {
    const values = new Set(
      (result?.records || [])
        .map((record) => record.class?.semester)
        .filter((value) => Number.isInteger(Number(value)) && Number(value) > 0),
    )
    return [...values].sort((first, second) => Number(first) - Number(second))
  }, [result])

  if (loading) {
    return <Card><Loader label="Loading your attendance..." /></Card>
  }

  if (error) {
    return <EmptyState title="Attendance unavailable" message={error} />
  }

  const records = result?.records || []
  const visibleRecords = semester === 'all'
    ? records
    : records.filter((record) => String(record.class?.semester) === semester)
  const totals = visibleRecords.reduce((summary, record) => {
    summary.total += 1
    if (record.status === 'present') summary.present += 1
    if (record.status === 'absent') summary.absent += 1
    return summary
  }, { total: 0, present: 0, absent: 0 })
  const percentage = totals.total
    ? Number(((totals.present / totals.total) * 100).toFixed(2))
    : 0
  const subjectSummaries = new Map()

  visibleRecords.forEach((record) => {
    const subjectId = String(record.subject?._id || record.subject?.code || record.subject?.name || 'unknown')
    if (!subjectSummaries.has(subjectId)) {
      subjectSummaries.set(subjectId, {
        subject: record.subject,
        total: 0,
        present: 0,
        absent: 0,
      })
    }
    const summary = subjectSummaries.get(subjectId)
    summary.total += 1
    if (record.status === 'present') summary.present += 1
    if (record.status === 'absent') summary.absent += 1
  })

  const subjectRows = [...subjectSummaries.values()].map((summary) => ({
    ...summary,
    percentage: summary.total
      ? Number(((summary.present / summary.total) * 100).toFixed(2))
      : 0,
  }))
  const subjectColumns = [
    {
      key: 'subject',
      label: 'Subject',
      render: (item) => (
        <div>
          <p className="font-semibold text-slate-800">{item.subject?.name || '—'}</p>
          <span className="mt-1 inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {item.subject?.code || '—'}
          </span>
        </div>
      ),
    },
    { key: 'total', label: 'Total held' },
    {
      key: 'present',
      label: 'Present',
      render: (item) => <span className="font-semibold text-emerald-700">{item.present}</span>,
    },
    {
      key: 'absent',
      label: 'Absent',
      render: (item) => <span className="font-semibold text-red-700">{item.absent}</span>,
    },
    {
      key: 'leave',
      label: 'Leave',
      render: () => <span title="Leave status is not tracked">—</span>,
    },
    {
      key: 'unmarked',
      label: 'Unmarked',
      render: () => <span title="Unmarked classes are not tracked">—</span>,
    },
    {
      key: 'percentage',
      label: 'Performance',
      render: (item) => {
        const belowThreshold = item.percentage < result.attendanceThreshold
        return (
          <div className="min-w-28">
            <p className={`font-bold ${belowThreshold ? 'text-red-700' : 'text-emerald-600'}`}>
              {item.percentage.toFixed(2)}%
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${belowThreshold ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, item.percentage)}%` }}
              />
            </div>
          </div>
        )
      },
    },
  ]
  const registerColumns = [
    {
      key: 'date',
      label: 'Date',
      render: (item) => <span className="font-semibold text-slate-800">{formatDate(item.date)}</span>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-800">{item.subject?.name || '—'}</p>
          <p className="mt-1 text-xs text-slate-500">{item.subject?.code || '—'}</p>
        </div>
      ),
    },
    { key: 'lectureNo', label: 'Lecture' },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <Badge color={item.status === 'present' ? 'green' : 'red'}>
          {item.status}
        </Badge>
      ),
    },
  ]
  const selectedSemester = semester === 'all' || semesters.some(
    (value) => String(value) === semester,
  )
    ? semester
    : 'all'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-950">My Attendance</h1>
        <label className="sr-only" htmlFor="attendance-semester">Attendance semester</label>
        <select
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          id="attendance-semester"
          value={selectedSemester}
          onChange={(event) => setSemester(event.target.value)}
        >
          <option value="all">Full Semester</option>
          {semesters.map((value) => (
            <option key={value} value={String(value)}>
              {getSemesterOrdinal(value)} Semester
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AttendanceMetric label="Total Classes" value={totals.total} />
        <AttendanceMetric label="Present" value={totals.present} />
        <AttendanceMetric label="Absent" value={totals.absent} />
        <AttendanceMetric label="Overall %" value={`${percentage.toFixed(2)}%`} highlight />
      </div>

      <Card className="overflow-hidden p-0">
        <div
          aria-label="Attendance views"
          className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-4"
          role="tablist"
        >
          {[
            ['summary', 'Subject-Wise Summary'],
            ['register', 'Attendance Register'],
          ].map(([tab, label]) => (
            <button
              aria-selected={activeTab === tab}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'summary' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Subject-wise summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Leave and unmarked counts are not tracked by the current attendance records.
                </p>
              </div>
              <Table
                columns={subjectColumns}
                rows={subjectRows}
                getRowKey={(item) => item.subject?._id || item.subject?.code || item.subject?.name}
                emptyMessage="No subject attendance has been recorded for this semester."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Attendance register</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your recorded attendance by date, subject, and lecture.
                </p>
              </div>
              <Table
                columns={registerColumns}
                rows={visibleRecords}
                getRowKey={(item) => item._id}
                emptyMessage="No attendance records are available for this semester."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default StudentAttendancePage
