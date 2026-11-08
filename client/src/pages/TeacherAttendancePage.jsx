import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Table from '../components/ui/Table'

function getId(value) {
  return String(value?._id || value || '')
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.errors?.[0]?.msg ||
    error.response?.data?.message ||
    fallback
}

function displayDate(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString()
}

function getLocalDate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function TeacherAttendancePage() {
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [classesError, setClassesError] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(getLocalDate)
  const [lectureNo, setLectureNo] = useState('1')
  const [attendance, setAttendance] = useState({})
  const [studentsResult, setStudentsResult] = useState({
    classId: '',
    students: [],
    error: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('mark')
  const [historyClassId, setHistoryClassId] = useState('')
  const [historySubjectId, setHistorySubjectId] = useState('')
  const [historyDate, setHistoryDate] = useState('')
  const [historyResult, setHistoryResult] = useState({
    key: '',
    records: [],
    error: '',
  })
  const [historyReloadKey, setHistoryReloadKey] = useState(0)
  const [editingAttendance, setEditingAttendance] = useState(null)
  const [editRecords, setEditRecords] = useState([])
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.get('/classes'), api.get('/subjects')])
      .then(([classResponse, subjectResponse]) => {
        if (!active) return
        const loadedSubjects = subjectResponse.data.subjects
        const subjectClassIds = new Set(loadedSubjects.map((subject) => getId(subject.class)))
        const assignedClasses = classResponse.data.classes.filter((item) =>
          subjectClassIds.has(getId(item)),
        )
        setClasses(assignedClasses)
        setSubjects(loadedSubjects)
        if (assignedClasses.length) {
          setClassId(getId(assignedClasses[0]))
          setHistoryClassId(getId(assignedClasses[0]))
        }
        setClassesError('')
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load your classes and subjects.')
          setClassesError(message)
          toast.error(message)
        }
      })
      .finally(() => {
        if (active) setClassesLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const classSubjects = useMemo(
    () => subjects.filter((subject) => getId(subject.class) === classId),
    [subjects, classId],
  )
  const selectedSubjectId = classSubjects.some(
    (subject) => getId(subject) === subjectId,
  )
    ? subjectId
    : getId(classSubjects[0])

  const historySubjects = useMemo(
    () => subjects.filter((subject) => getId(subject.class) === historyClassId),
    [subjects, historyClassId],
  )
  const selectedHistorySubjectId = historySubjects.some(
    (subject) => getId(subject) === historySubjectId,
  )
    ? historySubjectId
    : ''
  const students = studentsResult.classId === classId ? studentsResult.students : []
  const studentsError = studentsResult.classId === classId ? studentsResult.error : ''
  const studentsLoading = Boolean(classId && studentsResult.classId !== classId)
  const historyRequestKey = JSON.stringify([
    historyClassId,
    selectedHistorySubjectId,
    historyDate,
    historyReloadKey,
  ])
  const history = historyResult.key === historyRequestKey
    ? historyResult.records
    : []
  const historyError = historyResult.key === historyRequestKey
    ? historyResult.error
    : ''
  const historyLoading = Boolean(
    activeTab === 'history' &&
    historyClassId &&
    historyResult.key !== historyRequestKey,
  )

  useEffect(() => {
    if (!classId) {
      return undefined
    }

    let active = true
    api.get(`/attendance/class/${classId}/students`)
      .then((response) => {
        if (!active) return
        const loadedStudents = response.data.students
        setAttendance(
          Object.fromEntries(loadedStudents.map((student) => [student._id, 'present'])),
        )
        setStudentsResult({ classId, students: loadedStudents, error: '' })
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load the class student list.')
          setStudentsResult({ classId, students: [], error: message })
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [classId])

  useEffect(() => {
    if (activeTab !== 'history' || !historyClassId) return undefined

    let active = true
    const params = {}
    if (selectedHistorySubjectId) params.subject = selectedHistorySubjectId
    if (historyDate) params.date = historyDate

    api.get(`/attendance/class/${historyClassId}`, { params })
      .then((response) => {
        if (active) {
          setHistoryResult({
            key: historyRequestKey,
            records: response.data.attendance,
            error: '',
          })
        }
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load attendance history.')
          setHistoryResult({ key: historyRequestKey, records: [], error: message })
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [
    activeTab,
    historyClassId,
    selectedHistorySubjectId,
    historyDate,
    historyRequestKey,
    historyReloadKey,
  ])

  function setStudentStatus(studentId, status) {
    setAttendance((current) => ({ ...current, [studentId]: status }))
  }

  function markAllPresent() {
    setAttendance(Object.fromEntries(students.map((student) => [student._id, 'present'])))
  }

  async function submitAttendance(event) {
    event.preventDefault()
    if (!classId || !selectedSubjectId || students.length === 0) return

    setSubmitting(true)
    try {
      await api.post('/attendance', {
        class: classId,
        subject: selectedSubjectId,
        date,
        lectureNo: Number(lectureNo),
        records: students.map((student) => ({
          student: student._id,
          status: attendance[student._id],
        })),
      })
      toast.success('Attendance marked successfully.')
      setHistoryClassId(classId)
      setHistorySubjectId(selectedSubjectId)
      setHistoryDate(date)
      setActiveTab('history')
      setHistoryReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to submit attendance.'))
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(record) {
    setEditingAttendance(record)
    setEditRecords(
      record.records.map((item) => ({
        student: getId(item.student),
        name: item.student?.name || 'Student',
        rollNo: item.student?.rollNo || '',
        status: item.status,
      })),
    )
  }

  function changeEditStatus(studentId, status) {
    setEditRecords((current) =>
      current.map((record) =>
        record.student === studentId ? { ...record, status } : record,
      ),
    )
  }

  async function saveAttendanceEdit(event) {
    event.preventDefault()
    if (!editingAttendance) return

    setSavingEdit(true)
    try {
      await api.put(`/attendance/${editingAttendance._id}`, {
        records: editRecords.map(({ student, status }) => ({ student, status })),
      })
      toast.success('Attendance updated successfully.')
      setEditingAttendance(null)
      setHistoryReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update attendance.'))
    } finally {
      setSavingEdit(false)
    }
  }

  const historyColumns = [
    { key: 'date', label: 'Date', render: (item) => displayDate(item.date) },
    {
      key: 'lectureNo',
      label: 'Lecture',
      render: (item) => item.lectureNo,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (item) => `${item.subject?.name || '—'} (${item.subject?.code || '—'})`,
    },
    {
      key: 'attendance',
      label: 'Attendance',
      render: (item) => {
        const present = item.records.filter((record) => record.status === 'present').length
        return `${present} / ${item.records.length} present`
      },
    },
    {
      key: 'markedBy',
      label: 'Marked by',
      render: (item) => item.markedBy?.name || '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        item.canEdit ? (
          <Button
            variant="secondary"
            className="px-3 py-1.5"
            onClick={() => openEdit(item)}
          >
            Edit
          </Button>
        ) : (
          <span className="text-xs text-slate-400">View only</span>
        )
      ),
    },
  ]

  if (classesLoading) {
    return <Card><Loader label="Loading your classes..." /></Card>
  }

  if (classesError) {
    return <EmptyState title="Attendance unavailable" message={classesError} />
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No assigned classes"
        message="Attendance is available for classes where you teach an assigned subject."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mark attendance for your classes and review previous lectures.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'mark'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          type="button"
          onClick={() => setActiveTab('mark')}
        >
          Mark attendance
        </button>
        <button
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'history'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          type="button"
          onClick={() => setActiveTab('history')}
        >
          Attendance history
        </button>
      </div>

      {activeTab === 'mark' ? (
        <form className="space-y-5" onSubmit={submitAttendance}>
          <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              id="attendance-class"
              label="Class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value)
                setSubjectId('')
              }}
              options={classes.map((item) => ({
                value: getId(item),
                label: `${item.name} - Section ${item.section}`,
              }))}
            />
            <Select
              id="attendance-subject"
              label="Subject"
              value={selectedSubjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              options={classSubjects.map((item) => ({
                value: getId(item),
                label: `${item.name} (${item.code})`,
              }))}
            />
            <Input
              id="attendance-date"
              label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
            <Input
              id="attendance-lecture"
              label="Lecture number"
              type="number"
              min="1"
              max="30"
              value={lectureNo}
              onChange={(event) => setLectureNo(event.target.value)}
              required
            />
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Student list</h2>
                <p className="text-sm text-slate-500">
                  {students.length} active student{students.length === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={markAllPresent}
                disabled={students.length === 0 || studentsLoading}
              >
                Mark all present
              </Button>
            </div>

            {studentsLoading ? (
              <Loader label="Loading students..." />
            ) : studentsError ? (
              <EmptyState title="Unable to load students" message={studentsError} />
            ) : students.length === 0 ? (
              <EmptyState
                title="No active students"
                message="There are no active student accounts assigned to this class."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Roll number</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {students.map((student) => (
                      <tr key={student._id}>
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3">{student.rollNo || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {['present', 'absent'].map((status) => (
                              <button
                                aria-pressed={attendance[student._id] === status}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                                  attendance[student._id] === status
                                    ? status === 'present'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-red-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                key={status}
                                type="button"
                                onClick={() => setStudentStatus(student._id, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button
                type="submit"
                disabled={submitting || studentsLoading || students.length === 0 || !selectedSubjectId}
              >
                {submitting ? 'Submitting...' : 'Submit attendance'}
              </Button>
            </div>
          </Card>
        </form>
      ) : (
        <div className="space-y-4">
          <Card className="grid gap-4 sm:grid-cols-3">
            <Select
              id="history-class"
              label="Class"
              value={historyClassId}
              onChange={(event) => {
                setHistoryClassId(event.target.value)
                setHistorySubjectId('')
              }}
              options={classes.map((item) => ({
                value: getId(item),
                label: `${item.name} - Section ${item.section}`,
              }))}
            />
            <Select
              id="history-subject"
              label="Subject"
              value={selectedHistorySubjectId}
              onChange={(event) => setHistorySubjectId(event.target.value)}
              options={[
                { value: '', label: 'All my subjects' },
                ...historySubjects.map((item) => ({
                  value: getId(item),
                  label: `${item.name} (${item.code})`,
                })),
              ]}
            />
            <Input
              id="history-date"
              label="Date"
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
            />
          </Card>

          <Card>
            {historyLoading ? (
              <Loader label="Loading attendance history..." />
            ) : historyError ? (
              <EmptyState title="Unable to load history" message={historyError} />
            ) : (
              <Table
                columns={historyColumns}
                rows={history}
                getRowKey={(item) => item._id}
                emptyMessage="No attendance records match these filters."
              />
            )}
          </Card>
        </div>
      )}

      <Modal
        isOpen={Boolean(editingAttendance)}
        onClose={() => {
          if (!savingEdit) setEditingAttendance(null)
        }}
        title="Edit attendance"
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        {editingAttendance && (
          <form className="space-y-4" onSubmit={saveAttendanceEdit}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{displayDate(editingAttendance.date)}</span>
              <Badge color="blue">Lecture {editingAttendance.lectureNo}</Badge>
              <span>{editingAttendance.subject?.name}</span>
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {editRecords.map((record) => (
                <div
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={record.student}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{record.name}</p>
                    <p className="text-xs text-slate-500">{record.rollNo || 'No roll number'}</p>
                  </div>
                  <div className="flex gap-2">
                    {['present', 'absent'].map((status) => (
                      <button
                        aria-pressed={record.status === status}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                          record.status === status
                            ? status === 'present'
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        key={status}
                        type="button"
                        onClick={() => changeEditStatus(record.student, status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                onClick={() => setEditingAttendance(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default TeacherAttendancePage
