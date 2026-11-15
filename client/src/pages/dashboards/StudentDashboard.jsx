import { useEffect, useState } from 'react'
import api from '../../services/api'
import StudentProfileCard from '../../components/dashboard/StudentProfileCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function getErrorMessage(error) {
  return error.response?.data?.message || 'Class details are unavailable.'
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

function getStudentClassLabel(classRecord) {
  if (!classRecord) return 'Class not assigned'

  const course = classRecord.department?.code ||
    classRecord.department?.name ||
    classRecord.name
  const section = classRecord.section ? ` ${classRecord.section}` : ''
  const semester = classRecord.semester
    ? ` ${getSemesterOrdinal(classRecord.semester)} Semester`
    : ''

  return `${course || 'Class'}${section}${semester}`
}

function StudentDashboard({ user }) {
  const classId = typeof user.class === 'string' ? user.class : user.class?._id
  const [classDetails, setClassDetails] = useState({
    classRecord: typeof user.class === 'object' ? user.class : null,
    error: '',
  })

  useEffect(() => {
    if (!classId) return undefined

    let active = true
    api.get(`/timetable/classes/${classId}/data`)
      .then(({ data }) => {
        if (active) setClassDetails({ classRecord: data.class, error: '' })
      })
      .catch((error) => {
        if (active) {
          setClassDetails({ classRecord: null, error: getErrorMessage(error) })
        }
      })

    return () => {
      active = false
    }
  }, [classId])

  const fullName = user.name
  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Student"
        user={user}
        subtitle="Your academic progress, at a glance."
      />

      <section className="relative overflow-hidden rounded-[1.6rem] bg-[#171b22] px-6 py-6 text-white shadow-[0_20px_45px_rgba(17,24,39,0.14)] sm:px-8">
        <div aria-hidden="true" className="absolute -right-20 -top-32 h-80 w-80 rounded-full border-[42px] border-white/[0.035]" />
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lime-300 text-lg font-extrabold text-slate-950">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold tracking-tight">{fullName}</p>
              <p className="mt-1 truncate text-sm text-slate-300">
                {classDetails.error
                  ? 'Class details unavailable'
                  : getStudentClassLabel(classDetails.classRecord)}
              </p>
            </div>
          </div>
          <div className="min-w-28">
            <p className="text-xs font-medium text-slate-400">Roll no</p>
            <p className="mt-1 text-base font-semibold">{user.rollNo || '—'}</p>
          </div>
        </div>
        {classDetails.error && (
          <p className="relative mt-2 text-xs text-amber-200">{classDetails.error}</p>
        )}
        <div className="relative mt-5 border-t border-dashed border-white/20 pt-4 text-sm text-slate-300">
          Rayat Bahra Professional University
        </div>
      </section>

      <StudentProfileCard />
    </div>
  )
}

export default StudentDashboard
