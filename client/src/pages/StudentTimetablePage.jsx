import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Table from '../components/ui/Table'
import useAuth from '../context/useAuth'

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load your timetable.'
}

function StudentTimetablePage() {
  const { user } = useAuth()
  const classId = typeof user.class === 'string' ? user.class : user.class?._id
  const [classData, setClassData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(classId))

  useEffect(() => {
    let active = true
    if (!classId) {
      return () => {
        active = false
      }
    }

    api.get(`/timetable/classes/${classId}/data`)
      .then(({ data }) => {
        if (active) setClassData(data)
      })
      .catch((requestError) => {
        if (!active) return
        const message = getErrorMessage(requestError)
        setError(message)
        toast.error(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [classId])

  if (loading) {
    return <Card><Loader label="Loading your timetable..." /></Card>
  }

  if (error) {
    return <EmptyState title="Timetable unavailable" message={error} />
  }

  if (!classData?.class) {
    return (
      <EmptyState
        title="Class not assigned"
        message="Your timetable will appear here after the university assigns your class."
      />
    )
  }

  const schedule = [...(classData.existingTimetable || [])].sort((first, second) =>
    dayOrder.indexOf(first.day) - dayOrder.indexOf(second.day) ||
    first.period - second.period,
  )
  const scheduleColumns = [
    { key: 'day', label: 'Day' },
    { key: 'period', label: 'Period' },
    {
      key: 'time',
      label: 'Time',
      render: (item) => `${item.startTime || '—'} - ${item.endTime || '—'}`,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (item) => item.subjectId?.name || '—',
    },
    {
      key: 'faculty',
      label: 'Faculty',
      render: (item) => item.teacherId?.name || 'Not assigned',
    },
    {
      key: 'room',
      label: 'Room',
      render: (item) => item.roomId?.name || '—',
    },
  ]
  const subjectColumns = [
    {
      key: 'subject',
      label: 'Subject',
      render: (subject) => `${subject.name} (${subject.code || '—'})`,
    },
    {
      key: 'faculty',
      label: 'Faculty',
      render: (subject) => subject.teacher?.name || 'Not assigned',
    },
    { key: 'weeklyPeriods', label: 'Classes / week' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">My Timetable</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
          Your assigned class schedule, subjects, and faculty.
        </p>
      </div>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#f1f3f6]">Weekly schedule</h2>
        <Table
          columns={scheduleColumns}
          rows={schedule}
          getRowKey={(item) => item._id}
          emptyMessage="A timetable has not been published for your class yet."
        />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#f1f3f6]">Subjects and faculty</h2>
        <Table
          columns={subjectColumns}
          rows={classData.subjects || []}
          getRowKey={(item) => item._id}
          emptyMessage="No subjects have been assigned to your class yet."
        />
      </Card>
    </div>
  )
}

export default StudentTimetablePage
