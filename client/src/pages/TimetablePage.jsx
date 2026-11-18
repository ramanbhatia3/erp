import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Loader from '../components/ui/Loader'
import useAuth from '../context/useAuth'

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function TimetablePage() {
  const { user } = useAuth()
  const isTeacher = user.role === 'teacher'
  const [departments, setDepartments] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classData, setClassData] = useState(null)
  const [config, setConfig] = useState(null)
  const [facultyTimetable, setFacultyTimetable] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    const request = isTeacher
      ? api.get(`/timetable/faculty/${user.id}`)
          .then((response) => {
            if (active) setFacultyTimetable(response.data.timetable || [])
          })
      : Promise.all([
          api.get('/departments'),
          api.get('/settings'),
        ]).then(([departmentsResponse, configResponse]) => {
          if (!active) return
          setDepartments(departmentsResponse.data.departments || [])
          setConfig(configResponse.data.settings)
        })

    request
      .catch((error) => {
        if (!active) return
        const message = error.response?.data?.message || 'Unable to load timetable data.'
        toast.error(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isTeacher, user.id])

  useEffect(() => {
    if (!selectedDepartment) {
      return undefined
    }

    let active = true
    api.get('/classes', { params: { department: selectedDepartment } })
      .then((response) => {
        if (!active) return
        setClasses(response.data.classes || [])
        if (response.data.classes?.[0]) {
          setSelectedClassId(response.data.classes[0]._id)
        } else {
          setSelectedClassId('')
        }
      })
      .catch((error) => {
        if (active) {
          const message = error.response?.data?.message || 'Unable to load classes.'
          toast.error(message)
        }
      })
    return () => {
      active = false
    }
  }, [selectedDepartment])

  useEffect(() => {
    if (!selectedClassId) {
      return undefined
    }

    let active = true
    api.get(`/timetable/classes/${selectedClassId}/data`)
      .then((response) => {
        if (active) setClassData(response.data)
      })
      .catch((error) => {
        if (active) {
          const message = error.response?.data?.message || 'Unable to load timetable details.'
          toast.error(message)
        }
      })
    return () => {
      active = false
    }
  }, [selectedClassId])

  const scheduleMatrix = useMemo(() => {
    if (!classData?.existingTimetable) return []

    return dayOrder.map((day) => ({
      day,
      periods: classData.existingTimetable.filter((entry) => entry.day === day).sort((a, b) => a.period - b.period),
    }))
  }, [classData])

  function chooseDepartment(value) {
    setSelectedDepartment(value)
    setSelectedClassId('')
    setClasses([])
    setClassData(null)
  }

  function chooseClass(value) {
    setSelectedClassId(value)
    setClassData(null)
  }

  async function handleGenerate() {
    if (!selectedClassId) {
      toast.error('Choose a class before generating a timetable.')
      return
    }

    setSaving(true)
    try {
      const response = await api.post('/timetable/generate', {
        classId: selectedClassId,
        academicSession: config?.currentAcademicYear || classData?.class?.academicYear,
      })

      if (response.data.schedule) {
        setClassData((current) => ({
          ...current,
          existingTimetable: response.data.schedule,
          summary: {
            ...current?.summary,
            timetableEntries: response.data.schedule.length,
          },
        }))
      }
      toast.success('Timetable generated successfully.')
    } catch (error) {
      const message = error.response?.data?.message || 'Timetable generation failed.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loader message="Loading timetable configuration..." />
  }

  if (isTeacher) {
    const facultySchedule = (facultyTimetable || []).length
      ? dayOrder.map((day) => ({
      day,
      periods: facultyTimetable
        .filter((entry) => entry.day === day)
        .sort((a, b) => a.period - b.period),
      }))
      : []

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">My timetable</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
            Your assigned classes, subjects, and periods.
          </p>
        </div>
        {facultyTimetable === null ? (
          <Card>
            <p className="text-sm text-red-700 dark:text-rose-400">Unable to load your timetable. Refresh the page to try again.</p>
          </Card>
        ) : facultyTimetable.length ? (
          <Card className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-[#242730] dark:text-[#8a919e]">
                  <th className="px-3 py-3">Day</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Room</th>
                </tr>
              </thead>
              <tbody>
                {facultySchedule.flatMap(({ day, periods }) => periods.map((entry) => (
                  <tr className="border-b border-slate-100 last:border-0 dark:border-[#1e2128]" key={entry._id}>
                    <td className="px-3 py-3 font-semibold text-slate-800 dark:text-[#f1f3f6]">{day}</td>
                    <td className="px-3 py-3 dark:text-[#d1d6e0]">{entry.period}</td>
                    <td className="px-3 py-3 dark:text-[#d1d6e0]">{entry.startTime}-{entry.endTime}</td>
                    <td className="px-3 py-3 dark:text-[#d1d6e0]">
                      {entry.classId?.name} · Semester {entry.classId?.semester}
                    </td>
                    <td className="px-3 py-3 dark:text-[#d1d6e0]">{entry.subjectId?.name}</td>
                    <td className="px-3 py-3 dark:text-[#d1d6e0]">{entry.roomId?.name || '—'}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-600 dark:text-[#b5bcc9]">No timetable periods have been assigned to you yet.</p>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f1f3f6]">Automatic Timetable Generator</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
            Reuse existing ERP data to generate a class timetable without duplicate entry.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={saving || !selectedClassId}>
          {saving ? 'Generating...' : 'Generate Timetable'}
        </Button>
      </div>

      <Card className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-[#d1d6e0]">
          <span>Department</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400 dark:border-[#2b2e36] dark:bg-[#101216] dark:text-[#f1f3f6]"
            value={selectedDepartment}
            onChange={(event) => chooseDepartment(event.target.value)}
          >
            <option value="" className="dark:bg-[#15171c] dark:text-[#f1f3f6]">Select department</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id} className="dark:bg-[#15171c] dark:text-[#f1f3f6]">
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-[#d1d6e0]">
          <span>Class</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400 dark:border-[#2b2e36] dark:bg-[#101216] dark:text-[#f1f3f6]"
            value={selectedClassId}
            onChange={(event) => chooseClass(event.target.value)}
            disabled={!classes.length}
          >
            <option value="" className="dark:bg-[#15171c] dark:text-[#f1f3f6]">Select class</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass._id} value={schoolClass._id} className="dark:bg-[#15171c] dark:text-[#f1f3f6]">
                {schoolClass.name} · Semester {schoolClass.semester}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-[#d1d6e0]">Configuration</span>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-[#242730] dark:bg-[#101216] dark:text-[#d1d6e0]">
            {config ? `${config.workingDays?.join(', ') || 'Monday-Friday'} · ${config.numberOfPeriods || 7} periods/day` : 'Not configured yet'}
          </div>
        </div>
      </Card>

      {classData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-slate-500 dark:text-[#8a919e]">Class</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{classData.class?.name}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8a919e]">
              {classData.class?.department?.name || 'Department'} · Semester {classData.class?.semester}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500 dark:text-[#8a919e]">Subjects</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{classData.summary?.subjects || 0}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500 dark:text-[#8a919e]">Available Rooms</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{classData.summary?.rooms || 0}</p>
          </Card>
        </div>
      )}

      {classData && classData.subjects?.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subject assignments</h2>
            <Badge color="blue">{classData.subjects.length} subjects</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {classData.subjects.map((subject) => (
              <div key={subject._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#242730] dark:bg-[#101216]">
                <p className="font-semibold text-slate-800 dark:text-[#f1f3f6]">{subject.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-[#8a919e]">{subject.code}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-[#b5bcc9]">
                  {subject.teacher?.name || 'Teacher not assigned'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {classData && scheduleMatrix.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Weekly timetable preview</h2>
            <Badge color="green">{classData.existingTimetable.length} scheduled periods</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#68707f]">Day</th>
                  <th className="pb-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#68707f]">Period 1</th>
                  <th className="pb-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#68707f]">Period 2</th>
                  <th className="pb-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#68707f]">Period 3</th>
                  <th className="pb-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#68707f]">Period 4</th>
                  <th className="pb-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#68707f]">Period 5</th>
                </tr>
              </thead>
              <tbody>
                {scheduleMatrix.map(({ day, periods }) => (
                  <tr key={day} className="align-top">
                    <td className="pr-4 font-semibold text-slate-700 dark:text-[#d1d6e0]">{day}</td>
                    {[1, 2, 3, 4, 5].map((period) => {
                      const entry = periods.find((item) => item.period === period)
                      return (
                        <td key={`${day}-${period}`} className="pr-3">
                          {entry ? (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-xs text-slate-700 shadow-sm dark:border-[#2b3548] dark:bg-[#131720] dark:text-[#d1d6e0]">
                              <p className="font-semibold text-slate-900">{entry.subjectId?.name || 'Subject'}</p>
                              <p className="mt-1">{entry.teacherId?.name || 'Teacher'}</p>
                              <p className="mt-1 text-[11px] text-slate-500">{entry.roomId?.name || 'Room'}</p>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-400 dark:border-[#242730] dark:bg-[#101216] dark:text-[#68707f]">Free</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default TimetablePage
