import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import universityLogo from '../../assets/rbpulogo.webp'
import useAuth from '../../context/useAuth'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'

const roleLabels = {
  superadmin: 'Super Admin',
  teacher: 'Teacher',
  student: 'Student',
}

const menuIconPaths = {
  OV: 'm3 13 5-5 4 4 8-8M17 4h3v3',
  DP: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01M9 18h.01',
  US: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  CL: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  MC: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  SB: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
  SE: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 2.8-.2-.1a1.7 1.7 0 0 0-1.8.2l-.2.1h-3.2l-.1-.2a1.7 1.7 0 0 0-1.4-1l-.2-.1-1.6-2.8.1-.2a1.7 1.7 0 0 0-.3-1.8l-.1-.2v-3.2l.2-.1a1.7 1.7 0 0 0 1-1.4l.1-.2 2.8-1.6.2.1a1.7 1.7 0 0 0 1.8-.3l.2-.1h3.2l.1.2a1.7 1.7 0 0 0 1.4 1l.2.1 1.6 2.8-.1.2a1.7 1.7 0 0 0 .3 1.8l.1.2v3.2l-.2.1',
  AN: 'M3 11v2a2 2 0 0 0 2 2h2l9 5V4l-9 5H5a2 2 0 0 0-2 2ZM7 15l1 5h4l-2-4M20 9a5 5 0 0 1 0 6',
  EV: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01',
  TM: 'M3 6h18M7 6V3m10 3V3M4 10h16v10H4z',
  AT: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 15l2 2 5-5',
  MK: 'M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  RS: 'M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  FI: 'M3 7.5h18M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM7 15h4',
  HS: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01',
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

function SunIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
    </svg>
  )
}

const roleMenus = {
  superadmin: [
    ['Overview', 'OV'],
    ['Departments', 'DP'],
    ['Teachers', 'US'],
    ['Students', 'US'],
    ['Fees & Hostel', 'FI'],
    ['Marks', 'MK'],
    ['Classes', 'CL'],
    ['Subjects', 'SB'],
    ['Timetable', 'TM'],
    ['Settings', 'SE'],
    ['Announcements', 'AN'],
    ['Events', 'EV'],
  ],
  teacher: [
    ['Overview', 'OV'],
    ['My Classes', 'MC'],
    ['Subjects', 'SB'],
    ['Timetable', 'TM'],
    ['Attendance', 'AT'],
    ['Marks', 'MK'],
    ['Announcements', 'AN'],
    ['Events', 'EV'],
  ],
  student: [
    ['Overview', 'OV'],
    ['Attendance', 'AT'],
    ['Timetable', 'TM'],
    ['Results', 'RS'],
    ['Fees', 'FI'],
    ['Hostel', 'HS'],
  ],
}

function DashboardLayout({ user, role, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('rbpu-theme') === 'dark',
  )
  const location = useLocation()
  const isDepartmentsPage =
    role === 'superadmin' &&
    (
      location.pathname === '/dashboard/superadmin/departments' ||
      location.pathname.startsWith('/dashboard/superadmin/departments/')
    )
  const isTeachersPage =
    role === 'superadmin' &&
    (
      location.pathname === '/dashboard/superadmin/teachers' ||
      location.pathname.startsWith('/dashboard/superadmin/teachers/')
    )
  const isStudentsPage =
    role === 'superadmin' &&
    (
      location.pathname === '/dashboard/superadmin/students' ||
      location.pathname.startsWith('/dashboard/superadmin/students/')
    )
  const isFeesHostelPage =
    role === 'superadmin' &&
    location.pathname === '/dashboard/superadmin/fees-hostel'
  const isClassesPage = location.pathname.endsWith('/classes')
  const isSubjectsPage = location.pathname.endsWith('/subjects')
  const isAttendancePage =
    role === 'teacher' && location.pathname.endsWith('/attendance')
  const isStudentAttendancePage =
    role === 'student' && location.pathname.endsWith('/attendance')
  const isStudentMarksPage =
    role === 'student' && location.pathname.endsWith('/results')
  const isStudentFeesPage =
    role === 'student' && location.pathname.endsWith('/fees')
  const isStudentHostelPage =
    role === 'student' && location.pathname.endsWith('/hostel')
  const isTeacherMarksPage =
    role === 'teacher' && location.pathname.endsWith('/marks')
  const isAdminMarksPage =
    role === 'superadmin' && location.pathname === '/dashboard/superadmin/marks'
  const isSettingsPage =
    role === 'superadmin' && location.pathname.endsWith('/settings')
  const isAnnouncementsPage =
    location.pathname.endsWith('/announcements')
  const isEventsPage = location.pathname.endsWith('/events')
  const isTimetablePage = location.pathname.endsWith('/timetable')
  const [selectedMenu, setSelectedMenu] = useState('Overview')
  const { logout } = useAuth()
  const navigate = useNavigate()
  const menu = roleMenus[role] || roleMenus.student

  const rightPaneRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('rbpu-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (rightPaneRef.current) {
      rightPaneRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [location.pathname, location.search])

  function getActiveMenu() {
    if (isDepartmentsPage) return 'Departments'
    if (isTeachersPage) return 'Teachers'
    if (isStudentsPage) return 'Students'
    if (isFeesHostelPage) return 'Fees & Hostel'
    if (isClassesPage) return role === 'superadmin' ? 'Classes' : 'My Classes'
    if (isSubjectsPage) return 'Subjects'
    if (isTimetablePage) return 'Timetable'
    if (isAttendancePage || isStudentAttendancePage) return 'Attendance'
    if (isStudentMarksPage) return 'Results'
    if (isStudentFeesPage) return 'Fees'
    if (isStudentHostelPage) return 'Hostel'
    if (isTeacherMarksPage || isAdminMarksPage) return 'Marks'
    if (isSettingsPage) return 'Settings'
    if (isAnnouncementsPage) return 'Announcements'
    if (isEventsPage) return 'Events'
    return selectedMenu
  }

  const activeMenu = getActiveMenu()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function selectMenu(label) {
    setMobileMenuOpen(false)
    window.scrollTo(0, 0)
    if (rightPaneRef.current) {
      rightPaneRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }

    if (role === 'superadmin' && label === 'Departments') {
      navigate('/dashboard/superadmin/departments')
      return
    }

    if (role === 'superadmin' && label === 'Teachers') {
      navigate('/dashboard/superadmin/teachers')
      return
    }

    if (role === 'superadmin' && label === 'Students') {
      navigate('/dashboard/superadmin/students')
      return
    }

    if (role === 'superadmin' && label === 'Fees & Hostel') {
      navigate('/dashboard/superadmin/fees-hostel')
      return
    }

    if (role === 'superadmin' && label === 'Marks') {
      navigate('/dashboard/superadmin/marks')
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

    if (role === 'student' && ['Fees', 'Hostel'].includes(label)) {
      navigate(`/dashboard/student/${label.toLowerCase()}`)
      return
    }

    if (role === 'teacher' && label === 'Marks') {
      navigate('/dashboard/teacher/marks')
      return
    }

    if (role === 'superadmin' && label === 'Settings') {
      navigate('/dashboard/superadmin/settings')
      return
    }

    if (label === 'Announcements') {
      navigate(`/dashboard/${role}/announcements`)
      return
    }

    if (label === 'Events') {
      navigate(`/dashboard/${role}/events`)
      return
    }

    navigate(`/dashboard/${role}`)
    setSelectedMenu(label)
  }

  function renderSidebar(collapsed = false, mobile = false) {
    return (
      <aside
        className={`dashboard-sidebar flex h-full flex-col text-slate-300 shadow-[8px_0_32px_rgba(15,23,42,0.08)] dark:shadow-[8px_0_32px_rgba(0,0,0,0.5)] transition-[width] duration-300 ease-out ${
          collapsed && !mobile ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex h-[4.75rem] shrink-0 items-center border-b border-white/[0.08] dark:border-[#22252e] px-4">
          <img
            alt="Rayat Bahra Professional University"
            className={`h-10 object-contain object-left ${collapsed && !mobile ? 'w-10' : 'w-44'}`}
            src={universityLogo}
          />
        </div>
        {(!collapsed || mobile) && (
          <p className="shrink-0 px-5 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#6b7280]">
            Workspace
          </p>
        )}
        <nav
          className={`sidebar-scroll flex-1 space-y-1 px-3 pb-5 pt-3 ${
            mobile ? 'overflow-y-auto' : 'overflow-y-hidden hover:overflow-y-auto'
          }`}
          aria-label="Main navigation"
        >
          {menu.map(([label, icon]) => (
            <button
              key={label}
              className={`flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition duration-200 ${
                activeMenu === label
                  ? 'border-emerald-400/20 bg-emerald-400/[0.14] text-white shadow-inner shadow-white/[0.03] dark:border-emerald-500/30 dark:bg-emerald-500/[0.18] dark:text-white'
                  : 'text-slate-400 hover:bg-white/[0.055] hover:text-slate-100 dark:text-[#9ca3af] dark:hover:bg-white/[0.07] dark:hover:text-[#f3f4f6]'
              }`}
              type="button"
              onClick={() => selectMenu(label)}
              title={collapsed && !mobile ? label : undefined}
              aria-current={activeMenu === label ? 'page' : undefined}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  activeMenu === label
                    ? 'bg-emerald-400/15 text-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'text-slate-500 dark:text-[#788090]'
                }`}
              >
                <MenuIcon code={icon} />
              </span>
              {(!collapsed || mobile) && <span>{label}</span>}
            </button>
          ))}
        </nav>
        {(!collapsed || mobile) && (
          <div className="shrink-0 border-t border-white/[0.08] dark:border-[#22252e] px-5 py-4">
            <p className="text-xs font-medium text-slate-300 dark:text-[#d1d6e0]">Academic workspace</p>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-[#6b7280]">Rayat Bahra Professional University</p>
          </div>
        )}
      </aside>
    )
  }

  return (
    <div className="app-canvas flex h-screen overflow-hidden">
      <div className="hidden shrink-0 md:sticky md:top-0 md:h-screen md:block">
        {renderSidebar(sidebarCollapsed)}
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-slate-950/50 dark:bg-black/80"
              type="button"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="relative h-full w-64 shadow-xl"
              initial={{ x: -18 }}
              animate={{ x: 0 }}
              exit={{ x: -18 }}
            >
              {renderSidebar(false, true)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={rightPaneRef}
        className="content-scroll flex min-w-0 flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden"
      >
        <header className="sticky top-0 z-30 flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-slate-200/70 bg-[#f1f3f6]/90 px-4 backdrop-blur-xl sm:px-7 dark:border-[#20232a] dark:bg-[#0c0d10]/92">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-[#181b22]"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span aria-hidden="true" className="text-xl">☰</span>
            </button>
            <button
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:block dark:text-slate-300 dark:hover:bg-[#181b22]"
              type="button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              <span aria-hidden="true" className="text-lg">☰</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                University <span className="px-1 text-slate-300 dark:text-slate-600">/</span>
                <span className="text-blue-700 dark:text-blue-400">{activeMenu}</span>
              </p>
              <p className="hidden truncate text-sm font-semibold text-slate-800 sm:block dark:text-slate-200">
                {roleLabels[role] || role} workspace
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-[#2b2e36] dark:bg-[#181b22] dark:text-amber-400 dark:hover:border-amber-400/50 dark:hover:bg-[#22252c] dark:hover:text-amber-300"
              type="button"
              onClick={() => setIsDark((dark) => !dark)}
            >
              <span className="sr-only">Toggle theme</span>
              {isDark ? (
                <SunIcon className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <MoonIcon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>
            <span className="max-w-20 truncate text-xs font-medium text-slate-800 sm:hidden dark:text-slate-200">
              {user.name}
            </span>
            <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-3 sm:flex dark:border-[#242730]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-md shadow-emerald-900/15">
                {user.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="text-left">
                <p className="max-w-40 truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                  {user.name}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
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

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[82.5rem]">
            {isDepartmentsPage || isTeachersPage || isStudentsPage || isFeesHostelPage || isAdminMarksPage || isClassesPage || isSubjectsPage || isAttendancePage || isTeacherMarksPage || isStudentAttendancePage || isStudentMarksPage || isStudentFeesPage || isStudentHostelPage || isSettingsPage || isAnnouncementsPage || isEventsPage || isTimetablePage ? (
              <motion.div
                key={location.pathname}
                className="page-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            ) : activeMenu === 'Overview' ? (
              <motion.div
                key={location.pathname}
                className="page-content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
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
