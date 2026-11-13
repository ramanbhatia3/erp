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
import LowAttendanceStudentsPage from './LowAttendanceStudentsPage'
import TeacherMarksPage from './TeacherMarksPage'
import StudentMarksPage from './StudentMarksPage'
import AnnouncementsPage from './AnnouncementsPage'
import NotificationsPage from './NotificationsPage'
import LatestAnnouncementsWidget from '../components/dashboard/LatestAnnouncementsWidget'
import UpcomingEventsWidget from '../components/dashboard/UpcomingEventsWidget'
import EventsPage from './EventsPage'
import ClubsPage from './ClubsPage'
import TimetablePage from './TimetablePage'
import ClassAdvisorDashboard from './dashboards/ClassAdvisorDashboard'
import PlacementAdminDashboard from './dashboards/PlacementAdminDashboard'
import StudentDashboard from './dashboards/StudentDashboard'
import SuperAdminDashboard from './dashboards/SuperAdminDashboard'
import TeacherDashboard from './dashboards/TeacherDashboard'
import { getDashboardPath, getDashboardRole } from '../utils/dashboardPath'

const dashboards = {
  superadmin: SuperAdminDashboard,
  teacher: TeacherDashboard,
  classAdvisor: ClassAdvisorDashboard,
  student: StudentDashboard,
  placementAdmin: PlacementAdminDashboard,
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
    location.pathname === '/dashboard/superadmin/departments'
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
  const isLowAttendancePage =
    ['teacher', 'classAdvisor'].includes(dashboardRole) &&
    location.pathname === `/dashboard/${dashboardRole}/low-attendance`
  const isAnnouncementsPage =
    location.pathname === `/dashboard/${dashboardRole}/announcements`
  const isNotificationsPage =
    location.pathname === `/dashboard/${dashboardRole}/notifications`
  const isEventsPage =
    location.pathname === `/dashboard/${dashboardRole}/events`
  const isClubsPage =
    location.pathname === `/dashboard/${dashboardRole}/clubs`
  const isTimetablePage =
    location.pathname === `/dashboard/${dashboardRole}/timetable`

  return (
    <DashboardLayout user={user} role={dashboardRole}>
      {isTimetablePage ? (
        <TimetablePage />
      ) : isEventsPage ? (
        <EventsPage />
      ) : isClubsPage ? (
        <ClubsPage />
      ) : isNotificationsPage ? (
        <NotificationsPage />
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
      ) : isLowAttendancePage ? (
        <LowAttendanceStudentsPage />
      ) : isTeacherMarksPage ? (
        <TeacherMarksPage />
      ) : isStudentMarksPage ? (
        <StudentMarksPage />
      ) : (
        <div className="space-y-6">
          <RoleDashboard user={user} />
          <UpcomingEventsWidget />
          <LatestAnnouncementsWidget />
        </div>
      )}
    </DashboardLayout>
  )
}

export default DashboardPage
