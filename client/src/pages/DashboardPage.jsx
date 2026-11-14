import { Navigate, useParams } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import useAuth from '../context/useAuth'
import DepartmentsPage from './DepartmentsPage'
import UsersPage from './UsersPage'
import ClassesPage from './ClassesPage'
import SubjectsPage from './SubjectsPage'
import SettingsPage from './SettingsPage'
import TeacherAttendancePage from './TeacherAttendancePage'
import StudentAttendancePage from './StudentAttendancePage'
import TeacherMarksPage from './TeacherMarksPage'
import StudentMarksPage from './StudentMarksPage'
import AnnouncementsPage from './AnnouncementsPage'
import EventsPage from './EventsPage'
import TimetablePage from './TimetablePage'
import StudentDashboard from './dashboards/StudentDashboard'
import SuperAdminDashboard from './dashboards/SuperAdminDashboard'
import TeacherDashboard from './dashboards/TeacherDashboard'
import { getDashboardPath, getDashboardRole } from '../utils/dashboardPath'

const dashboards = {
  superadmin: SuperAdminDashboard,
  teacher: TeacherDashboard,
  student: StudentDashboard,
}

function DashboardPage() {
  const { user } = useAuth()
  const { role } = useParams()
  const location = useLocation()
  const dashboardRole = getDashboardRole(user)

  if (role !== dashboardRole) {
    return <Navigate to={getDashboardPath(user)} replace />
  }

  const RoleDashboard = dashboards[dashboardRole]
  const isDepartmentsPage =
    dashboardRole === 'superadmin' &&
    (
      location.pathname === '/dashboard/superadmin/departments' ||
      location.pathname.startsWith('/dashboard/superadmin/departments/')
    )
  const isUsersPage =
    dashboardRole === 'superadmin' &&
    location.pathname === '/dashboard/superadmin/users'
  const isClassesPage = location.pathname.endsWith('/classes')
  const isSubjectsPage = location.pathname.endsWith('/subjects')
  const isSettingsPage =
    dashboardRole === 'superadmin' &&
    location.pathname === '/dashboard/superadmin/settings'
  const isTeacherAttendancePage =
    dashboardRole === 'teacher' &&
    location.pathname === '/dashboard/teacher/attendance'
  const isStudentAttendancePage =
    dashboardRole === 'student' &&
    location.pathname === '/dashboard/student/attendance'
  const isStudentMarksPage =
    dashboardRole === 'student' &&
    location.pathname === '/dashboard/student/results'
  const isTeacherMarksPage =
    dashboardRole === 'teacher' &&
    location.pathname === '/dashboard/teacher/marks'
  const isAnnouncementsPage =
    location.pathname === `/dashboard/${dashboardRole}/announcements`
  const isEventsPage =
    location.pathname === `/dashboard/${dashboardRole}/events`
  const isTimetablePage =
    location.pathname === `/dashboard/${dashboardRole}/timetable`
  const isAdminPage =
    dashboardRole === 'superadmin' &&
    [isDepartmentsPage, isUsersPage, isClassesPage, isSubjectsPage, isSettingsPage]
      .some(Boolean)
  const isRolePage =
    dashboardRole === 'teacher'
      ? [isClassesPage, isSubjectsPage, isTimetablePage, isTeacherAttendancePage,
          isTeacherMarksPage, isAnnouncementsPage, isEventsPage].some(Boolean)
      : dashboardRole === 'student'
        ? [isStudentAttendancePage, isStudentMarksPage].some(Boolean)
        : dashboardRole === 'superadmin'
          ? [isAdminPage, isTimetablePage, isAnnouncementsPage, isEventsPage].some(Boolean)
          : false

  if (
    location.pathname !== `/dashboard/${dashboardRole}` &&
    !isRolePage
  ) {
    return <Navigate to={getDashboardPath(user)} replace />
  }

  return (
    <DashboardLayout user={user} role={dashboardRole}>
      {isTimetablePage ? (
        <TimetablePage />
      ) : isEventsPage ? (
        <EventsPage />
      ) : isAnnouncementsPage ? (
        <AnnouncementsPage />
      ) : isDepartmentsPage ? (
        <DepartmentsPage />
      ) : isUsersPage ? (
        <UsersPage />
      ) : isClassesPage ? (
        <ClassesPage />
      ) : isSubjectsPage ? (
        <SubjectsPage />
      ) : isSettingsPage ? (
        <SettingsPage />
      ) : isTeacherAttendancePage ? (
        <TeacherAttendancePage />
      ) : isStudentAttendancePage ? (
        <StudentAttendancePage />
      ) : isTeacherMarksPage ? (
        <TeacherMarksPage />
      ) : isStudentMarksPage ? (
        <StudentMarksPage />
      ) : <RoleDashboard user={user} />}
    </DashboardLayout>
  )
}

export default DashboardPage
