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

module.exports = { protect, authorizeRoles }
