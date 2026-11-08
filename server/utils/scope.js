// Build a Mongo filter for records associated with the signed-in user.
function buildScopeFilter(user) {
  if (!user || !user.role) {
    throw new Error('A signed-in user with a role is required to build a scope.')
  }

  if (user.role === 'superadmin') {
    return {}
  }

  if (user.role === 'teacher') {
    if (!user.department) {
      throw new Error('A teacher must have a department to access scoped records.')
    }

    return { department: user.department }
  }

  if (user.role === 'student') {
    const studentId = user._id || user.id

    if (!studentId) {
      throw new Error('A student ID is required to access scoped records.')
    }

    return { student: studentId }
  }

  throw new Error(`No record scope is configured for the ${user.role} role.`)
}

module.exports = buildScopeFilter
