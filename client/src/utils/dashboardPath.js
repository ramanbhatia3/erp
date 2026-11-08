const dashboardRoles = [
  'superadmin',
  'teacher',
  'classAdvisor',
  'student',
  'placementAdmin',
]

export function getDashboardRole(user) {
  if (user.role === 'teacher' && user.isClassAdvisor) {
    return 'classAdvisor'
  }

  return user.role
}

export function getDashboardPath(user) {
  const role = typeof user === 'string' ? user : getDashboardRole(user)

  if (!dashboardRoles.includes(role)) {
    throw new Error('No dashboard is configured for this role.')
  }

  return `/dashboard/${role}`
}

export { dashboardRoles }
