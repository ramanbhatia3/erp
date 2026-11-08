import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Loader from '../components/ui/Loader'
import Select from '../components/ui/Select'

const EMPTY_MARKS = []

function getId(value) {
  return String(value?._id || value || '')
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.errors?.[0]?.msg ||
    error.response?.data?.message ||
    fallback
}

function TeacherMarksPage() {
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [components, setComponents] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [initialError, setInitialError] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [rosterResult, setRosterResult] = useState({
    classId: '',
    students: [],
    error: '',
  })
  const [marksResult, setMarksResult] = useState({
    key: '',
    marks: [],
    error: '',
  })
  const [values, setValues] = useState({})
  const [savingStudentId, setSavingStudentId] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([api.get('/classes'), api.get('/subjects'), api.get('/settings')])
      .then(([classResponse, subjectResponse, settingsResponse]) => {
        if (!active) return
        const loadedSubjects = subjectResponse.data.subjects
        const assignedClassIds = new Set(
          loadedSubjects.map((subject) => getId(subject.class)),
        )
        const assignedClasses = classResponse.data.classes.filter((item) =>
          assignedClassIds.has(getId(item)),
        )
        setClasses(assignedClasses)
        setSubjects(loadedSubjects)
        setComponents(settingsResponse.data.settings.marksComponents)
        if (assignedClasses.length) setClassId(getId(assignedClasses[0]))
        setInitialError('')
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load your marks workspace.')
          setInitialError(message)
          toast.error(message)
        }
      })
      .finally(() => {
        if (active) setInitialLoading(false)
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

  useEffect(() => {
    if (!classId) return undefined

    let active = true
    api.get(`/attendance/class/${classId}/students`)
      .then((response) => {
        if (!active) return
        setRosterResult({
          classId,
          students: response.data.students,
          error: '',
        })
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load class students.')
          setRosterResult({ classId, students: [], error: message })
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [classId])

  const marksRequestKey = JSON.stringify([classId, selectedSubjectId, reloadKey])
  useEffect(() => {
    if (!classId || !selectedSubjectId) return undefined

    let active = true
    api.get(`/marks/class/${classId}/subject/${selectedSubjectId}`)
      .then((response) => {
        if (!active) return
        const loadedMarks = response.data.marks
        setMarksResult({ key: marksRequestKey, marks: loadedMarks, error: '' })
        setValues(
          Object.fromEntries(
            loadedMarks.map((mark) => [
              getId(mark.student),
              Object.fromEntries(
                mark.components.map((component) => [
                  component.name,
                  String(component.marksObtained),
                ]),
              ),
            ]),
          ),
        )
      })
      .catch((error) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load marks.')
          setMarksResult({ key: marksRequestKey, marks: [], error: message })
          toast.error(message)
        }
      })

    return () => {
      active = false
    }
  }, [classId, selectedSubjectId, marksRequestKey])

  const students = rosterResult.classId === classId ? rosterResult.students : []
  const rosterError = rosterResult.classId === classId ? rosterResult.error : ''
  const rosterLoading = Boolean(classId && rosterResult.classId !== classId)
  const marks = marksResult.key === marksRequestKey
    ? marksResult.marks
    : EMPTY_MARKS
  const marksError = marksResult.key === marksRequestKey ? marksResult.error : ''
  const marksLoading = Boolean(
    classId && selectedSubjectId && marksResult.key !== marksRequestKey,
  )
  const markByStudent = useMemo(
    () => new Map(marks.map((mark) => [getId(mark.student), mark])),
    [marks],
  )

  function updateValue(studentId, componentName, value) {
    setValues((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [componentName]: value,
      },
    }))
  }

  function buildPayload(studentId) {
    const studentValues = values[studentId] || {}
    for (const component of components) {
      const value = studentValues[component.name]
      if (value === undefined || value === '') {
        throw new Error(`Enter marks for ${component.name}.`)
      }

      const marksObtained = Number(value)
      if (
        !Number.isFinite(marksObtained) ||
        marksObtained < 0 ||
        marksObtained > component.maxMarks
      ) {
        throw new Error(
          `${component.name} marks must be between 0 and ${component.maxMarks}.`,
        )
      }
    }

    return {
      student: studentId,
      subject: selectedSubjectId,
      components: components.map((component) => ({
        name: component.name,
        marksObtained: Number(studentValues[component.name]),
        maxMarks: component.maxMarks,
      })),
    }
  }

  async function saveStudent(studentId) {
    const payload = buildPayload(studentId)
    const existing = markByStudent.get(studentId)
    if (existing) {
      await api.put(`/marks/${existing._id}`, { components: payload.components })
    } else {
      await api.post('/marks', payload)
    }
  }

  async function saveOne(studentId) {
    setSavingStudentId(studentId)
    try {
      await saveStudent(studentId)
      toast.success('Student marks saved.')
      setReloadKey((key) => key + 1)
    } catch (error) {
      toast.error(
        error.message && !error.response
          ? error.message
          : getErrorMessage(error, 'Unable to save student marks.'),
      )
    } finally {
      setSavingStudentId('')
    }
  }

  async function saveAll() {
    setSavingAll(true)
    let savedCount = 0
    const failures = []

    for (const student of students) {
      try {
        await saveStudent(getId(student))
        savedCount += 1
      } catch (error) {
        failures.push(
          `${student.name}: ${
            error.message && !error.response
              ? error.message
              : getErrorMessage(error, 'Unable to save marks.')
          }`,
        )
      }
    }

    if (savedCount > 0) {
      toast.success(`Saved marks for ${savedCount} student${savedCount === 1 ? '' : 's'}.`)
      setReloadKey((key) => key + 1)
    }
    if (failures.length > 0) {
      toast.error(`${failures.length} row(s) need attention. ${failures[0]}`)
    }
    setSavingAll(false)
  }

  if (initialLoading) {
    return <Card><Loader label="Loading marks workspace..." /></Card>
  }

  if (initialError) {
    return <EmptyState title="Marks unavailable" message={initialError} />
  }

  if (classes.length === 0 || components.length === 0) {
    return (
      <EmptyState
        title={classes.length === 0 ? 'No assigned subjects' : 'No marks components configured'}
        message={
          classes.length === 0
            ? 'Marks entry is available for classes where you teach an assigned subject.'
            : 'Ask a superadmin to configure marks components in Settings.'
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enter Marks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter marks for configured assessment components.
          </p>
        </div>
        <Button
          onClick={saveAll}
          disabled={
            savingAll || students.length === 0 || rosterLoading || marksLoading
          }
        >
          {savingAll ? 'Saving all marks...' : 'Save all students'}
        </Button>
      </div>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Select
          id="marks-class"
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
          id="marks-subject"
          label="Subject"
          value={selectedSubjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          options={classSubjects.map((item) => ({
            value: getId(item),
            label: `${item.name} (${item.code})`,
          }))}
        />
      </Card>

      <Card>
        {rosterLoading || marksLoading ? (
          <Loader label={rosterLoading ? 'Loading students...' : 'Loading marks...'} />
        ) : rosterError ? (
          <EmptyState title="Unable to load students" message={rosterError} />
        ) : marksError ? (
          <EmptyState title="Unable to load marks" message={marksError} />
        ) : students.length === 0 ? (
          <EmptyState
            title="No active students"
            message="There are no active student accounts in this class."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Roll number</th>
                  {components.map((component) => (
                    <th className="min-w-36 px-4 py-3 font-semibold" key={component.name}>
                      {component.name} <span className="normal-case">/ {component.maxMarks}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {students.map((student) => {
                  const studentId = getId(student)
                  const existingMark = markByStudent.get(studentId)
                  return (
                    <tr key={studentId}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {student.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {student.rollNo || '—'}
                      </td>
                      {components.map((component) => (
                        <td className="px-4 py-3" key={component.name}>
                          <input
                            aria-label={`${component.name} marks for ${student.name}`}
                            className="w-28 rounded-lg border border-slate-300 px-2.5 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            type="number"
                            min="0"
                            max={component.maxMarks}
                            step="0.01"
                            value={values[studentId]?.[component.name] ?? ''}
                            onChange={(event) =>
                              updateValue(studentId, component.name, event.target.value)
                            }
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <Button
                          className="px-3 py-1.5"
                          onClick={() => saveOne(studentId)}
                          disabled={savingAll || savingStudentId === studentId}
                        >
                          {savingStudentId === studentId
                            ? 'Saving...'
                            : existingMark
                              ? 'Update'
                              : 'Save'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default TeacherMarksPage
