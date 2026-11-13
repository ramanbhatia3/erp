import { useEffect, useState } from 'react'
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

const menuIconPaths = {
  OV: 'm3 13 5-5 4 4 8-8M17 4h3v3',
  DP: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01M9 18h.01',
  US: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  CL: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  MC: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  SB: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  SE: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 2.8-.2-.1a1.7 1.7 0 0 0-1.8.2l-.2.1h-3.2l-.1-.2a1.7 1.7 0 0 0-1.4-1l-.2-.1-1.6-2.8.1-.2a1.7 1.7 0 0 0-.3-1.8l-.1-.2v-3.2l.2-.1a1.7 1.7 0 0 0 1-1.4l.1-.2 2.8-1.6.2.1a1.7 1.7 0 0 0 1.8-.3l.2-.1h3.2l.1.2a1.7 1.7 0 0 0 1.4 1l.2.1 1.6 2.8-.1.2a1.7 1.7 0 0 0 .3 1.8l.1.2v3.2l-.2.1',
  RP: 'M3 3v18h18M8 16v-4M13 16V7M18 16v-7',
  AN: 'M3 11v2a2 2 0 0 0 2 2h2l9 5V4l-9 5H5a2 2 0 0 0-2 2ZM7 15l1 5h4l-2-4M20 9a5 5 0 0 1 0 6',
  EV: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01',
  NO: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  TM: 'M3 6h18M7 6V3m10 3V3M4 10h16v10H4z',
  AT: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 15l2 2 5-5',
  MK: 'M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  LA: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  ST: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  CB: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM3 20a7 7 0 0 1 14 0M18 8a3 3 0 0 1 0 6M20 17a5 5 0 0 1 2 3',
  PD: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18M10 12v2h4v-2',
  AP: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
  RS: 'M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  NT: 'M3 11v2a2 2 0 0 0 2 2h2l9 5V4l-9 5H5a2 2 0 0 0-2 2ZM7 15l1 5h4l-2-4M20 9a5 5 0 0 1 0 6',
}

function MenuIcon({ code }) {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <path d={menuIconPaths[code] || menuIconPaths.OV} />
    </svg>
  )
}

const roleMenus = {
  superadmin: [
    ['Overview', 'OV'],
    ['Departments', 'DP'],
    ['Users', 'US'],
    ['Classes', 'CL'],
    ['Subjects', 'SB'],
    ['Timetable', 'TM'],
    ['Settings', 'SE'],
    ['Reports', 'RP'],
    ['Announcements', 'AN'],
    ['Events', 'EV'],
    ['Clubs', 'CB'],
    ['Notifications', 'NO'],
  ],
  teacher: [
    ['Overview', 'OV'],
    ['My Classes', 'MC'],
    ['Subjects', 'SB'],
    ['Timetable', 'TM'],
    ['Attendance', 'AT'],
    ['Marks', 'MK'],
    ['Low Attendance Students', 'LA'],
    ['Students', 'ST'],
    ['Announcements', 'AN'],
    ['Events', 'EV'],
    ['Clubs', 'CB'],
    ['Notifications', 'NO'],
  ],
  classAdvisor: [
    ['Overview', 'OV'],
    ['My Class', 'MC'],
    ['Students', 'ST'],
    ['Timetable', 'TM'],
    ['Attendance', 'AT'],
    ['Low Attendance Students', 'LA'],
    ['Announcements', 'AN'],
    ['Events', 'EV'],
    ['Clubs', 'CB'],
    ['Notifications', 'NO'],
  ],
  student: [
    ['Overview', 'OV'],
    ['My Subjects', 'SB'],
    ['Timetable', 'TM'],
    ['Attendance', 'AT'],
    ['Results', 'RS'],
    ['Notices', 'NT'],
    ['Events', 'EV'],
    ['Clubs', 'CB'],
    ['Notifications', 'NO'],
  ],
  placementAdmin: [
    ['Overview', 'OV'],
    ['Students', 'ST'],
    ['Placement Drives', 'PD'],
    ['Applications', 'AP'],
    ['Reports', 'RP'],
    ['Notices', 'NT'],
    ['Events', 'EV'],
    ['Clubs', 'CB'],
    ['Notifications', 'NO'],
  ],
}

function DashboardLayout({ user, role, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('rbpu-theme') === 'dark',
  )
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
  const isEventsPage = location.pathname.endsWith('/events')
  const isClubsPage = location.pathname.endsWith('/clubs')
  const isTimetablePage = location.pathname.endsWith('/timetable')
  const [selectedMenu, setSelectedMenu] = useState('Overview')
  const { logout } = useAuth()
  const navigate = useNavigate()
  const menu = roleMenus[role] || roleMenus.student

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('rbpu-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const activeMenu = isDepartmentsPage
    ? 'Departments'
    : isUsersPage
      ? 'Users'
      : isClassesPage
      ? role === 'superadmin' ? 'Classes' : 'My Classes'
      : isSubjectsPage
        ? 'Subjects'
        : isTimetablePage
          ? 'Timetable'
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
                          : isEventsPage
                            ? 'Events'
                            : isClubsPage
                              ? 'Clubs'
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

    if (label === 'Timetable') {
      navigate(`/dashboard/${role}/timetable`)
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

    if (label === 'Events') {
      navigate(`/dashboard/${role}/events`)
      return
    }

    if (label === 'Clubs') {
      navigate(`/dashboard/${role}/clubs`)
      return
    }

    navigate(`/dashboard/${role}`)
    setSelectedMenu(label)
  }

  function renderSidebar(collapsed = false, mobile = false) {
    return (
      <aside
        className={`dashboard-sidebar flex h-full flex-col bg-[var(--sidebar-bg)] text-slate-300 shadow-[8px_0_32px_rgba(15,23,42,0.08)] ${
          collapsed && !mobile ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.08] px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 font-extrabold text-white shadow-lg shadow-blue-950/40">
            RB
          </span>
          {(!collapsed || mobile) && (
            <span className="font-bold tracking-tight text-white">
              RBPU <span className="font-medium text-slate-400">Hub</span>
            </span>
          )}
        </div>
        {(!collapsed || mobile) && (
          <p className="px-5 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>
        )}
        <nav
          className="flex-1 space-y-1 px-3 pb-5 pt-4"
          aria-label="Main navigation"
        >
          {menu.map(([label, icon]) => (
            <button
              key={label}
              className={`flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition duration-200 ${
                activeMenu === label
                  ? 'border-blue-400/15 bg-blue-500/15 text-white shadow-inner shadow-white/[0.02]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
              }`}
              type="button"
              onClick={() => selectMenu(label)}
              title={collapsed && !mobile ? label : undefined}
              aria-current={activeMenu === label ? 'page' : undefined}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  activeMenu === label
                    ? 'bg-blue-500/20 text-blue-200'
                    : 'text-slate-500'
                }`}
              >
                <MenuIcon code={icon} />
              </span>
              {(!collapsed || mobile) && <span>{label}</span>}
            </button>
          ))}
        </nav>
        {(!collapsed || mobile) && (
          <div className="border-t border-white/[0.08] px-5 py-4">
            <p className="text-xs font-medium text-slate-300">RBPU University</p>
            <p className="mt-1 text-[10px] text-slate-500">Academic ERP · 2026</p>
          </div>
        )}
      </aside>
    )
  }

  return (
    <div className="app-canvas flex min-h-screen">
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
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-7">
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
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                RBPU Hub <span className="px-1 text-slate-300">/</span>
                <span className="text-blue-700">{activeMenu}</span>
              </p>
              <p className="hidden truncate text-sm font-semibold text-slate-800 sm:block">
                {roleLabels[role] || role} workspace
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-lg text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              type="button"
              onClick={() => setIsDark((dark) => !dark)}
            >
              <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
            </button>
            <NotificationBell />
            <span className="max-w-20 truncate text-xs font-medium text-slate-800 sm:hidden">
              {user.name}
            </span>
            <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-3 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-md shadow-blue-900/15">
                {user.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="text-left">
                <p className="max-w-40 truncate text-xs font-bold text-slate-800">
                  {user.name}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  {roleLabels[role] || role}
                </p>
              </div>
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
          <div className="mx-auto max-w-[1440px]">
            {isDepartmentsPage || isUsersPage || isClassesPage || isSubjectsPage || isAttendancePage || isTeacherMarksPage || isStudentAttendancePage || isStudentMarksPage || isLowAttendancePage || isSettingsPage || isAnnouncementsPage || isNotificationsPage || isEventsPage || isClubsPage ? (
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
