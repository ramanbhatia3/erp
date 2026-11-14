import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Loader from '../../components/ui/Loader'
import StatCard from '../../components/ui/StatCard'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'

function SuperAdminDashboard({ user }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/departments'),
      api.get('/classes'),
      api.get('/users', { params: { role: 'teacher', active: 'true' } }),
      api.get('/users', { params: { role: 'student', active: 'true' } }),
      api.get('/subjects'),
    ])
      .then(([departmentResponse, classResponse, teacherResponse, studentResponse, subjectResponse]) => {
        if (!active) return
        setOverview({
          departments: departmentResponse.data.departments,
          classes: classResponse.data.classes,
          teachers: teacherResponse.data.users,
          students: studentResponse.data.users,
          subjects: subjectResponse.data.subjects,
        })
        setError('')
      })
      .catch((requestError) => {
        if (active) {
          const message = requestError.response?.data?.message || 'Unable to load the university overview.'
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

  const departments = overview?.departments || []
  const classes = overview?.classes || []
  const subjects = overview?.subjects || []

  return (
    <div className="space-y-6">
      <DashboardWelcome
        title="Super Admin"
        user={user}
        subtitle="University-wide people, departments, and academic structure."
      />
      {loading ? (
        <Card><Loader label="Loading university overview..." /></Card>
      ) : error ? (
        <EmptyState title="Overview unavailable" message={error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Departments" value={departments.length} />
            <StatCard label="Teachers" value={overview.teachers.length} />
            <StatCard label="Classes" value={classes.length} />
            <StatCard label="Students" value={overview.students.length} />
          </div>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Departments and class incharges</h2>
              <p className="mt-1 text-sm text-slate-500">
                Head of department, each class, its incharge, and assigned teachers.
              </p>
            </div>
            {departments.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {departments.map((department) => {
                  const departmentClasses = classes.filter(
                    (schoolClass) => schoolClass.department?._id === department._id,
                  )
                  return (
                    <Card key={department._id} className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            className="text-lg font-bold text-blue-800 hover:underline"
                            to="/dashboard/superadmin/departments"
                          >
                            {department.name}
                          </Link>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            {department.code} · {departmentClasses.length} classes
                          </p>
                        </div>
                        <p className="text-sm text-slate-600">
                          HOD: <span className="font-semibold text-slate-900">{department.hod?.name || 'Not assigned'}</span>
                        </p>
                      </div>
                      {departmentClasses.length ? (
                        <div className="divide-y divide-slate-100">
                          {departmentClasses.map((schoolClass) => {
                            const classSubjects = subjects.filter(
                              (subject) => subject.class?._id === schoolClass._id,
                            )
                            const classTeachers = [...new Set(
                              classSubjects.map((subject) => subject.teacher?.name).filter(Boolean),
                            )]
                            return (
                              <div className="py-3 first:pt-0 last:pb-0" key={schoolClass._id}>
                                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                                  <span className="font-semibold text-slate-800">
                                    {schoolClass.name} · {schoolClass.section}
                                  </span>
                                  <span className="text-slate-600">
                                    Incharge: {schoolClass.advisor?.name || 'Not assigned'}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  Teachers: {classTeachers.length ? classTeachers.join(', ') : 'Not assigned'}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No classes in this department yet.</p>
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No departments yet" message="Create a department to begin organizing classes." />
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default SuperAdminDashboard
