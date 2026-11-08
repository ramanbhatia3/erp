const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Verify the bearer token and attach its active user to the request.
async function protect(req, res, next) {
  const authorization = req.headers.authorization
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ message: 'Authentication is required.' })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication is not configured.' })
  }

  let decoded

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'The token is invalid or expired.' })
  }

  try {
    const user = await User.findById(decoded.sub)

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'The account is unavailable.' })
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

// Restrict a route to the listed roles.
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication is required.' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission.' })
    }

    next()
  }
}

function getDepartmentId(value) {
  if (value && typeof value === 'object' && value._id) {
    return String(value._id)
  }

  return value ? String(value) : null
}

// Compare the requested department with a teacher's or student's department.
function sameDepartment(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication is required.' })
  }

  if (req.user.role === 'superadmin') {
    return next()
  }

  if (!['teacher', 'student'].includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission.' })
  }

  const requestedDepartment =
    req.resource?.department ||
    req.params.departmentId ||
    req.params.department ||
    req.body?.department ||
    req.query.department
  const userDepartment = getDepartmentId(req.user.department)
  const requestedDepartmentId = getDepartmentId(requestedDepartment)

  if (!requestedDepartmentId) {
    return res.status(400).json({ message: 'A department is required.' })
  }

  if (!userDepartment || userDepartment !== requestedDepartmentId) {
    return res.status(403).json({ message: 'You do not have access to this department.' })
  }

  next()
}

module.exports = { protect, authorizeRoles, sameDepartment }
