import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import NotificationBell from './NotificationBell'

const roleLabels = {
  superadmin: 'Super Admin',
  teacher: 'Teacher',
  classAdvisor: 'Class Advisor',
  student: 'Student',
  placementAdmin: 'Placement Admin',
}

const roleMenus = {
  superadmin: [
    ['Overview', 'OV'],
    ['Departments', 'DP'],
    ['Users', 'US'],
    ['Classes', 'CL'],
    ['Subjects', 'SB'],
    ['Settings', 'SE'],
    ['Reports', 'RP'],
    ['Announcements', 'AN'],
    ['Notifications', 'NO'],
  ],
  teacher: [
    ['Overview', 'OV'],
    ['My Classes', 'MC'],
    ['Subjects', 'SB'],
    ['Attendance', 'AT'],
    ['Marks', 'MK'],
    ['Low Attendance Students', 'LA'],
    ['Students', 'ST'],
    ['Announcements', 'AN'],
    ['Notifications', 'NO'],
  ],
  classAdvisor: [
    ['Overview', 'OV'],
    ['My Class', 'MC'],
    ['Students', 'ST'],
    ['Attendance', 'AT'],
    ['Low Attendance Students', 'LA'],
    ['Announcements', 'AN'],
    ['Notifications', 'NO'],
  ],
  student: [
    ['Overview', 'OV'],
    ['My Subjects', 'SB'],
    ['Attendance', 'AT'],
    ['Results', 'RS'],
    ['Notices', 'NT'],
    ['Notifications', 'NO'],
  ],
  placementAdmin: [
    ['Overview', 'OV'],
    ['Students', 'ST'],
    ['Placement Drives', 'PD'],
    ['Applications', 'AP'],
    ['Reports', 'RP'],
    ['Notices', 'NT'],
    ['Notifications', 'NO'],
  ],
}

function DashboardLayout({ user, role, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const isDepartmentsPage = location.pathname.endsWith('/departments')
  const isUsersPage = location.pathname.endsWith('/users')
  const isClassesPage = location.pathname.endsWith('/classes')
  const isSubjectsPage = location.pathname.endsWith('/subjects')
  const isAttendancePage =
    role === 'teacher' && location.pathname.endsWith('/attendance')
  const isStudentAttendancePage =
    role === 'student' && location.pathname.endsWith('/attendance')
  const isStudentMarksPage =
    role === 'student' && location.pathname.endsWith('/results')
  const isTeacherMarksPage =
    role === 'teacher' && location.pathname.endsWith('/marks')
  const isLowAttendancePage =
    ['teacher', 'classAdvisor'].includes(role) &&
    location.pathname.endsWith('/low-attendance')
  const isSettingsPage =
    role === 'superadmin' && location.pathname.endsWith('/settings')
  const isAnnouncementsPage =
    location.pathname.endsWith('/announcements')
  const isNotificationsPage =
    location.pathname.endsWith('/notifications')
  const [selectedMenu, setSelectedMenu] = useState('Overview')
  const { logout } = useAuth()
  const navigate = useNavigate()
  const menu = roleMenus[role] || roleMenus.student
  const activeMenu = isDepartmentsPage
    ? 'Departments'
    : isUsersPage
      ? 'Users'
      : isClassesPage
      ? role === 'superadmin' ? 'Classes' : 'My Classes'
      : isSubjectsPage
        ? 'Subjects'
        : isAttendancePage
          ? 'Attendance'
          : isStudentAttendancePage
            ? 'Attendance'
            : isStudentMarksPage
              ? 'Results'
              : isTeacherMarksPage
                ? 'Marks'
                : isLowAttendancePage
                  ? 'Low Attendance Students'
                  : isSettingsPage
                    ? 'Settings'
                    : isAnnouncementsPage
                      ? role === 'student' || role === 'placementAdmin'
                        ? 'Notices'
                        : 'Announcements'
                      : isNotificationsPage
                        ? 'Notifications'
                      : selectedMenu

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function selectMenu(label) {
    setMobileMenuOpen(false)

    if (role === 'superadmin' && label === 'Departments') {
      navigate('/dashboard/superadmin/departments')
      return
    }

    if (role === 'superadmin' && label === 'Users') {
      navigate('/dashboard/superadmin/users')
      return
    }

    if (['Classes', 'My Classes', 'My Class'].includes(label)) {
      navigate(`/dashboard/${role}/classes`)
      return
    }

    if (label === 'Subjects') {
      navigate(`/dashboard/${role}/subjects`)
      return
    }

    if (role === 'teacher' && label === 'Attendance') {
      navigate('/dashboard/teacher/attendance')
      return
    }

    if (role === 'student' && label === 'Attendance') {
      navigate('/dashboard/student/attendance')
      return
    }

    if (role === 'student' && label === 'Results') {
      navigate('/dashboard/student/results')
      return
    }

    if (role === 'teacher' && label === 'Marks') {
      navigate('/dashboard/teacher/marks')
      return
    }

    if (
      ['teacher', 'classAdvisor'].includes(role) &&
      label === 'Low Attendance Students'
    ) {
      navigate(`/dashboard/${role}/low-attendance`)
      return
    }

    if (role === 'superadmin' && label === 'Settings') {
      navigate('/dashboard/superadmin/settings')
      return
    }

    if (label === 'Announcements' || label === 'Notices') {
      navigate(`/dashboard/${role}/announcements`)
      return
    }

    if (label === 'Notifications') {
      navigate(`/dashboard/${role}/notifications`)
      return
    }

    navigate(`/dashboard/${role}`)
    setSelectedMenu(label)
  }

  function renderSidebar(collapsed = false, mobile = false) {
    return (
      <aside
        className={`flex h-full flex-col bg-slate-950 text-slate-300 ${
          collapsed && !mobile ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
            RB
          </span>
          {(!collapsed || mobile) && (
            <span className="font-semibold tracking-wide text-white">RBPU Hub</span>
          )}
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Main navigation">
          {menu.map(([label, icon]) => (
            <button
              key={label}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                activeMenu === label
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              type="button"
              onClick={() => selectMenu(label)}
              title={collapsed && !mobile ? label : undefined}
              aria-current={activeMenu === label ? 'page' : undefined}
            >
              <span className="w-7 shrink-0 text-center text-xs font-bold">
                {icon}
              </span>
              {(!collapsed || mobile) && <span>{label}</span>}
            </button>
          ))}
        </nav>
        {(!collapsed || mobile) && (
          <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
            University ERP
          </div>
        )}
      </aside>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="hidden shrink-0 md:block">
        {renderSidebar(sidebarCollapsed)}
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/50"
            type="button"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative h-full w-64 shadow-xl">{renderSidebar(false, true)}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span aria-hidden="true" className="text-xl">☰</span>
            </button>
            <button
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:block"
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              <span aria-hidden="true" className="text-lg">☰</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {activeMenu}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                RBPU Hub workspace
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <span className="max-w-20 truncate text-xs font-medium text-slate-800 sm:hidden">
              {user.name}
            </span>
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-medium text-slate-800">
                {user.name}
              </p>
              <Badge color="blue">{roleLabels[role] || role}</Badge>
            </div>
            <div className="sm:hidden">
              <Badge color="blue">{roleLabels[role] || role}</Badge>
            </div>
            <Button
              className="px-3 sm:px-4"
              variant="secondary"
              onClick={handleLogout}
            >
              <span className="hidden sm:inline">Log out</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {isDepartmentsPage || isUsersPage || isClassesPage || isSubjectsPage || isAttendancePage || isTeacherMarksPage || isStudentAttendancePage || isStudentMarksPage || isLowAttendancePage || isSettingsPage || isAnnouncementsPage || isNotificationsPage ? (
              children
            ) : activeMenu === 'Overview' ? (
              children
            ) : (
              <EmptyState
                title={`${activeMenu} coming soon`}
                message={`The ${activeMenu.toLowerCase()} workspace is not available yet.`}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
