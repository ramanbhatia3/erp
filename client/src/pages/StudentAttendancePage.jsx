import { useEffect, useState } from 'react'
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

function formatDate(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString()
}

function StudentAttendancePage() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <Card><Loader label="Loading your attendance..." /></Card>
  }

  if (error) {
    return <EmptyState title="Attendance unavailable" message={error} />
  }

  const overall = result.overall
  const percentage = Math.min(100, overall.percentage)
  const subjectColumns = [
    {
      key: 'subject',
      label: 'Subject',
      render: (item) => `${item.subject?.name || '—'} (${item.subject?.code || '—'})`,
    },
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'total', label: 'Total lectures' },
    {
      key: 'percentage',
      label: 'Percentage',
      render: (item) => (
        <Badge color={item.percentage < result.attendanceThreshold ? 'red' : 'green'}>
          {item.percentage}%
        </Badge>
      ),
    },
  ]
  const dailyColumns = [
    { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
    {
      key: 'class',
      label: 'Class',
      render: (item) => `${item.class?.name || '—'} - ${item.class?.section || '—'}`,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (item) => `${item.subject?.name || '—'} (${item.subject?.code || '—'})`,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review your attendance percentage and lecture history.
        </p>
      </div>

      {result.shortage && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
          role="alert"
        >
          <p className="font-semibold">Attendance shortage alert</p>
          <p className="mt-1 text-sm">
            Your attendance is below the {result.attendanceThreshold}% threshold
            {result.overallBelowThreshold ? ' overall' : ' in one or more subjects'}.
          </p>
          {result.shortageSubjects.length > 0 && (
            <p className="mt-2 text-sm">
              Subjects below threshold:{' '}
              {result.shortageSubjects
                .map((item) => `${item.subject?.name || 'Subject'} (${item.percentage}%)`)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Overall attendance</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{overall.percentage}%</p>
            <p className="mt-1 text-sm text-slate-500">
              {overall.present} present of {overall.total} recorded lectures
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Required threshold: <span className="font-semibold text-slate-800">{result.attendanceThreshold}%</span>
          </p>
        </div>
        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"
          aria-label={`Overall attendance ${overall.percentage}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overall.percentage}
        >
          <div
            className={`h-full rounded-full transition-all ${
              overall.percentage < result.attendanceThreshold ? 'bg-red-600' : 'bg-green-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Subject-wise attendance</h2>
          <p className="mt-1 text-sm text-slate-500">Attendance percentage for each subject.</p>
        </div>
        <Table
          columns={subjectColumns}
          rows={result.subjects}
          getRowKey={(item) => item.subject?._id}
          emptyMessage="No subject attendance has been recorded yet."
        />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Daily attendance</h2>
          <p className="mt-1 text-sm text-slate-500">Your recorded status for each lecture.</p>
        </div>
        <Table
          columns={dailyColumns}
          rows={result.records}
          getRowKey={(item) => item._id}
          emptyMessage="No daily attendance records are available."
        />
      </Card>
    </div>
  )
}

export default StudentAttendancePage
