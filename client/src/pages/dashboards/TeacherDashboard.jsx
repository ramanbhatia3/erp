import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Loader from '../../components/ui/Loader'
import StatCard from '../../components/ui/StatCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function TeacherDashboard({ user }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadOverview() {
      try {
        const [classResponse, subjectResponse] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects'),
        ])
        const classes = classResponse.data.classes
        const subjects = subjectResponse.data.subjects
        const rosterResponses = await Promise.all(
          classes.map((schoolClass) => api.get(`/attendance/class/${schoolClass._id}/students`)),
        )
        if (!active) return
        const studentIds = new Set(
          rosterResponses.flatMap((response) =>
            response.data.students.map((student) => student._id),
          ),
        )
        setOverview({
          classes: classes.map((schoolClass, index) => ({
            ...schoolClass,
            studentsCount: rosterResponses[index].data.students.length,
          })),
          subjects,
          studentsCount: studentIds.size,
        })
        setError('')
      } catch (requestError) {
        if (active) {
          const message = requestError.response?.data?.message || 'Unable to load your teaching overview.'
          setError(message)
          toast.error(message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOverview()
    return () => {
      active = false
    }
  }, [])

  const classes = overview?.classes || []
  const subjects = overview?.subjects || []

  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Teaching"
        user={user}
        subtitle="Your assigned classes, students, subjects, and teaching tools."
      />
      {loading ? (
        <Card><Loader label="Loading your classes..." /></Card>
      ) : error ? (
        <EmptyState title="Teaching overview unavailable" message={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="My Classes" value={classes.length} />
            <StatCard label="Students" value={overview.studentsCount} />
            <StatCard label="Subjects" value={subjects.length} />
          </div>
          {classes.length ? (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Assigned classes</h2>
              <div className="grid gap-4 xl:grid-cols-2">
                {classes.map((schoolClass) => {
                  const classSubjects = subjects.filter(
                    (subject) => subject.class?._id === schoolClass._id,
                  )
                  return (
                    <Card className="space-y-3" key={schoolClass._id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {schoolClass.name} · {schoolClass.section}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {schoolClass.department?.name} · Semester {schoolClass.semester}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                          {schoolClass.studentsCount} students
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Subjects: {classSubjects.map((subject) => subject.name).join(', ') || 'None assigned'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800" to="/dashboard/teacher/attendance">
                          Mark attendance
                        </Link>
                        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to="/dashboard/teacher/marks">
                          Enter marks
                        </Link>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </section>
          ) : (
            <EmptyState title="No classes assigned" message="Classes and subjects assigned to you will appear here." />
          )}
        </>
      )}
    </div>
  )
}

export default TeacherDashboard
