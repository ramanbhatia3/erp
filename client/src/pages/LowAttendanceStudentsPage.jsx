import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Unable to load low attendance students.'
}

function LowAttendanceStudentsPage() {
  const [classId, setClassId] = useState('')
  const [result, setResult] = useState({
    key: '',
    classes: [],
    students: [],
    attendanceThreshold: 75,
    error: '',
  })

  useEffect(() => {
    let active = true
    const requestKey = classId || 'all'
    const params = classId ? { classId } : {}

    api.get('/attendance/low-attendance', { params })
      .then((response) => {
        if (active) {
          setResult({
            key: requestKey,
            classes: response.data.classes,
            students: response.data.students,
            attendanceThreshold: response.data.attendanceThreshold,
            error: '',
          })
        }
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error)
          setResult({
            key: requestKey,
            classes: [],
            students: [],
            attendanceThreshold: 75,
            error: message,
          })
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [classId])

  const requestKey = classId || 'all'
  const loading = result.key !== requestKey
  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-800">{item.student.name}</p>
          <p className="text-xs text-slate-500">
            {item.student.rollNo || 'No roll number'}
          </p>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (item) => `${item.class.name} - Section ${item.class.section}`,
    },
    {
      key: 'overall',
      label: 'Overall',
      render: (item) => (
        <Badge color={item.overall.percentage < result.attendanceThreshold ? 'red' : 'yellow'}>
          {item.overall.percentage}%
        </Badge>
      ),
    },
    {
      key: 'shortageSubjects',
      label: 'Subjects below threshold',
      render: (item) => item.shortageSubjects.length
        ? (
            <ul className="space-y-1">
              {item.shortageSubjects.map((subject) => (
                <li key={subject.subject?._id}>
                  {subject.subject?.name || 'Subject'}: {subject.percentage}%
                </li>
              ))}
            </ul>
          )
        : <span className="text-slate-500">Overall attendance only</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Low Attendance Students</h1>
        <p className="mt-1 text-sm text-slate-500">
          Students below the university attendance threshold of{' '}
          {result.attendanceThreshold}% in classes you teach or advise.
        </p>
      </div>

      <Card className="max-w-md">
        <Select
          id="low-attendance-class"
          label="Filter by class"
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          options={[
            { value: '', label: 'All my classes' },
            ...result.classes.map((item) => ({
              value: item._id,
              label: `${item.name} - Section ${item.section}`,
            })),
          ]}
        />
      </Card>

      <Card>
        {loading ? (
          <Loader label="Checking attendance..." />
        ) : result.error ? (
          <EmptyState title="Unable to load students" message={result.error} />
        ) : (
          <Table
            columns={columns}
            rows={result.students}
            getRowKey={(item) => `${item.class._id}:${item.student._id}`}
            emptyMessage={`No students are below the ${result.attendanceThreshold}% threshold.`}
          />
        )}
      </Card>
    </div>
  )
}

export default LowAttendanceStudentsPage
