import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import Select from '../components/ui/Select'
import { getSemesterTerm } from '../utils/classDisplay'

const EMPTY_MARKS = []
const PROGRAM_CODES = new Set(['CSE', 'IT', 'ME', 'CE'])

const DEFAULT_THEORY_COMPONENTS = [
  { name: 'MST 1', maxMarks: 24, group: 'mst' },
  { name: 'MST 2', maxMarks: 24, group: 'mst' },
  { name: 'Assignment 1', maxMarks: 10, group: 'assignment' },
  { name: 'Assignment 2', maxMarks: 10, group: 'assignment' },
  { name: 'Assignment 3', maxMarks: 10, group: 'assignment' },
  { name: 'Attendance', maxMarks: 6, group: 'attendance' },
  { name: 'Final Exam', maxMarks: 60, group: 'final' },
]

const DEFAULT_LAB_COMPONENTS = [
  { name: 'Viva 1', maxMarks: 10, group: 'lab_internal' },
  { name: 'Viva 2', maxMarks: 10, group: 'lab_internal' },
  { name: 'Lab Record', maxMarks: 10, group: 'lab_internal' },
  { name: 'Final Exam', maxMarks: 20, group: 'lab_external' },
]

function getId(value) {
  return String(value?._id || value || '')
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.errors?.[0]?.msg ||
    error.response?.data?.message ||
    fallback
}

function getProgramCode(value) {
  const code = String(value || '').trim().toUpperCase()
  return PROGRAM_CODES.has(code) ? code : ''
}

function TeacherMarksPage({ isAdmin = false }) {
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [components, setComponents] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [initialError, setInitialError] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
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
        const assignedClasses = isAdmin
          ? classResponse.data.classes
          : classResponse.data.classes.filter((item) =>
              assignedClassIds.has(getId(item)),
            )
        setClasses(assignedClasses)
        setSubjects(loadedSubjects)
        setComponents(settingsResponse.data.settings?.marksComponents || DEFAULT_THEORY_COMPONENTS)
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
  }, [isAdmin])

  const classSubjects = useMemo(
    () => subjects.filter((subject) => getId(subject.class) === classId),
    [subjects, classId],
  )
  const selectedSubjectId = classSubjects.some(
    (subject) => getId(subject) === subjectId,
  )
    ? subjectId
    : getId(classSubjects[0])
  const selectedSubject = classSubjects.find(
    (subject) => getId(subject) === selectedSubjectId,
  )
  const selectedClass = classes.find((item) => getId(item) === classId)

  const isLab = Boolean(selectedSubject?.isLab || selectedSubject?.type === 'Lab')

  const effectiveComponents = useMemo(() => {
    if (components && components.length > 0) return components
    return isLab ? DEFAULT_LAB_COMPONENTS : DEFAULT_THEORY_COMPONENTS
  }, [components, isLab])

  useEffect(() => {
    if (!classId || (isAdmin && !selectedClass)) return undefined

    let active = true
    const rosterRequest = isAdmin
      ? api.get('/users', {
          params: {
            role: 'student',
          },
        }).then((response) => response.data.users.filter((student) => {
          const studentClassName =
            typeof student.class === 'object' ? student.class?.name : ''
          const studentDepartmentCode = student.department?.code
          const studentProgram =
            getProgramCode(student.program) ||
            getProgramCode(studentClassName) ||
            (studentDepartmentCode === 'AS'
              ? ''
              : getProgramCode(studentDepartmentCode))
          const classProgram =
            getProgramCode(selectedClass.name) ||
            (selectedClass.department?.code === 'AS'
              ? ''
              : getProgramCode(selectedClass.department?.code))
          return getId(student.class) === classId ||
            Boolean(classProgram && studentProgram === classProgram)
        }))
      : api.get(`/attendance/class/${classId}/students`)
        .then((response) => response.data.students)

    rosterRequest
      .then((response) => {
        if (!active) return
        setRosterResult({
          classId,
          students: response,
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
  }, [classId, isAdmin, selectedClass])

  const marksRequestKey = JSON.stringify([classId, selectedSubjectId, reloadKey])
  useEffect(() => {
    if (!classId || !selectedSubjectId) return undefined

    let active = true
    api.get(`/marks/class/${classId}/subject/${selectedSubjectId}`)
      .then((response) => {
        if (!active) return
        const loadedMarks = response.data.marks
        if (response.data.settings?.marksComponents && response.data.settings.marksComponents.length > 0) {
          setComponents(response.data.settings.marksComponents)
        } else if (isLab) {
          setComponents(DEFAULT_LAB_COMPONENTS)
        } else {
          setComponents(DEFAULT_THEORY_COMPONENTS)
        }
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
  }, [classId, selectedSubjectId, marksRequestKey, isLab])

  const students = useMemo(
    () => (rosterResult.classId === classId ? rosterResult.students : []),
    [rosterResult.classId, rosterResult.students, classId],
  )
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

  const availableBatches = useMemo(() => {
    const years = new Set(
      students.map((s) => s.startingYear).filter(Boolean),
    )
    if (years.size === 0) return ['2023', '2024', '2025', '2026']
    return [...years].sort((a, b) => Number(b) - Number(a))
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (batchFilter && String(student.startingYear) !== String(batchFilter)) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        (student.name || '').toLowerCase().includes(q) ||
        (student.rollNo || '').toLowerCase().includes(q) ||
        (student.email || '').toLowerCase().includes(q)
      )
    })
  }, [students, batchFilter, searchQuery])

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
    const activeComponents = effectiveComponents
    for (const component of activeComponents) {
      const value = studentValues[component.name]
      if (value === undefined || value === '') continue

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
      components: activeComponents
        .filter((component) => {
          const value = studentValues[component.name]
          return value !== undefined && value !== ''
        })
        .map((component) => ({
          name: component.name,
          marksObtained: Math.round(Number(studentValues[component.name])),
          maxMarks: component.maxMarks,
          ...(component.group ? { group: component.group } : {}),
        })),
    }
  }

  async function saveStudent(studentId) {
    const payload = buildPayload(studentId)
    if (payload.components.length === 0) return false
    const existing = markByStudent.get(studentId)
    if (existing) {
      await api.put(`/marks/${existing._id}`, { components: payload.components })
    } else {
      await api.post('/marks', payload)
    }
    return true
  }

  async function saveOne(studentId) {
    setSavingStudentId(studentId)
    try {
      const saved = await saveStudent(studentId)
      if (!saved) {
        toast.error('Enter at least one marks component for this student.')
        return
      }
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

    for (const student of filteredStudents) {
      try {
        if (await saveStudent(getId(student))) savedCount += 1
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
    } else if (failures.length === 0) {
      toast.error('Enter marks for at least one student before saving.')
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

  if (classes.length === 0) {
    return (
      <EmptyState
        title={isAdmin ? 'No classes available' : 'No assigned subjects'}
        message={
          isAdmin
            ? 'Add a class and at least one subject before entering marks.'
            : 'Marks entry is available for classes where you teach an assigned subject.'
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">Enter Marks</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
            {isAdmin
              ? 'Admin marks management: select class, subject, and batch to enter or update whole number marks.'
              : 'Enter whole numbers for any available components. Leave unmarked components blank.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={saveAll}
            disabled={
              savingAll || filteredStudents.length === 0 || rosterLoading || marksLoading
            }
          >
            {savingAll ? 'Saving all marks...' : `Save all (${filteredStudents.length})`}
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
              label: `${item.name} · Semester ${item.semester} (${getSemesterTerm(item.semester)})`,
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
        </div>

        {/* Search & Batch Filters */}
        <div className="grid gap-4 pt-1 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              id="search-student"
              label="Search student"
              placeholder="Search by student name, roll number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Select
              id="filter-batch"
              label="Filter by Batch (Starting Year)"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              options={[
                { value: '', label: 'All batches' },
                ...availableBatches.map((year) => ({
                  value: String(year),
                  label: `Batch ${year} (Matriculated ${year})`,
                })),
              ]}
            />
          </div>
        </div>

        {selectedSubject && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-[#242730] dark:text-[#8a919e]">
            <span>
              Type: <strong className="text-slate-800 dark:text-[#f1f3f6]">{selectedSubject.isLab ? 'Lab / Practical' : (selectedSubject.type || 'Theory')}</strong>
            </span>
            <span>·</span>
            <span>
              Credits: <strong className="text-slate-800 dark:text-[#f1f3f6]">{selectedSubject.credits ?? (selectedSubject.isLab ? 1 : 3)}</strong>
            </span>
            <span>·</span>
            <span>
              Evaluation Scheme: <strong className="text-slate-800 dark:text-[#f1f3f6]">
                {selectedSubject.isLab
                  ? '50 Marks: 30 Internal (Viva 1 [10], Viva 2 [10], Lab Record [10]) + 20 External'
                  : '100 Marks: 40 Internal (MST 1 & 2 [24], Assn 1-3 [10], Att [6]) + 60 External'}
              </strong>
            </span>
            {batchFilter && (
              <>
                <span>·</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Showing Batch {batchFilter} ({filteredStudents.length} students)
                </span>
              </>
            )}
          </div>
        )}
      </Card>

      <Card>
        {rosterLoading || marksLoading ? (
          <Loader label={rosterLoading ? 'Loading students...' : 'Loading marks...'} />
        ) : rosterError ? (
          <EmptyState title="Unable to load students" message={rosterError} />
        ) : marksError ? (
          <EmptyState title="Unable to load marks" message={marksError} />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title={searchQuery || batchFilter ? 'No matching students' : 'No eligible students'}
            message={
              searchQuery || batchFilter
                ? 'No students matched your search query or batch filter.'
                : isAdmin
                  ? 'There are no students from this program available for the selected class.'
                  : 'There are no active students currently assigned to this class.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#242730]">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-[#242730]">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-[#101216] dark:text-[#8a919e]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Roll number</th>
                  {isAdmin && <th className="px-4 py-3 font-semibold">Batch</th>}
                  {effectiveComponents.map((component) => (
                    <th className="min-w-32 px-4 py-3 font-semibold" key={component.name}>
                      {component.name} <span className="normal-case opacity-75 dark:text-[#8a919e]">/ {component.maxMarks}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700 dark:divide-[#1e2128] dark:bg-[#15171c] dark:text-[#d1d6e0]">
                {filteredStudents.map((student) => {
                  const studentId = getId(student)
                  const existingMark = markByStudent.get(studentId)
                  const studentValues = values[studentId] || {}
                  const enteredSum = effectiveComponents.reduce((sum, comp) => {
                    const val = Number(studentValues[comp.name])
                    return Number.isFinite(val) ? sum + val : sum
                  }, 0)
                  const maxPossible = effectiveComponents.reduce((sum, comp) => sum + comp.maxMarks, 0)
                  const hasAnyValue = effectiveComponents.some((comp) => studentValues[comp.name] !== undefined && studentValues[comp.name] !== '')

                  return (
                    <tr key={studentId}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-[#f1f3f6]">
                        {student.name}
                        <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-[#8a919e]">
                          {student.email || ''}
                          {isAdmin && student.currentSemester ? ` · Sem ${student.currentSemester}` : ''}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-[#b5bcc9]">
                        {student.rollNo || '—'}
                      </td>
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-[#b5bcc9]">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-[#20232a] dark:text-[#d1d6e0]">
                            {student.startingYear ? `Batch ${student.startingYear}` : '—'}
                          </span>
                        </td>
                      )}
                      {effectiveComponents.map((component) => (
                        <td className="px-4 py-3" key={component.name}>
                          <input
                            aria-label={`${component.name} marks for ${student.name}`}
                            className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-[#2b2e36] dark:bg-[#101216] dark:text-[#f1f3f6] dark:focus:ring-blue-500/20"
                            type="number"
                            min="0"
                            max={component.maxMarks}
                            step="1"
                            placeholder="0"
                            value={values[studentId]?.[component.name] ?? ''}
                            onChange={(event) =>
                              updateValue(studentId, component.name, event.target.value)
                            }
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900 dark:text-[#f1f3f6]">
                        {hasAnyValue ? (
                          <span>
                            {Math.round(enteredSum)} <span className="text-xs font-normal text-slate-500 dark:text-[#8a919e]">/ {maxPossible}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-normal text-slate-400">—</span>
                        )}
                      </td>
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
