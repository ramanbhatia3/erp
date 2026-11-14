const dashboardRoles = [
  'superadmin',
  'teacher',
  'student',
]

export function getDashboardRole(user) {
  return user.role
}

export function getDashboardPath(user) {
  const role = typeof user === 'string' ? user : getDashboardRole(user)

  if (!dashboardRoles.includes(role)) {
    return '/unauthorized'
  }

  return `/dashboard/${role}`
}

export { dashboardRoles }
