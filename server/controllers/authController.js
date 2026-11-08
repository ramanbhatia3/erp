const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Class = require('../models/Class')

async function getUserInfo(user) {
  const isClassAdvisor =
    user.role === 'teacher' &&
    Boolean(await Class.exists({ advisor: user._id }))

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    class: user.class,
    section: user.section,
    rollNo: user.rollNo,
    isFirstLogin: user.isFirstLogin,
    isActive: user.isActive,
    isClassAdvisor,
  }
}

async function login(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured.' })
    }

    const email = req.body.email.toLowerCase()
    const user = await User.findOne({ email }).select('+password')

    if (
      !user ||
      !user.isActive ||
      !(await user.comparePassword(req.body.password))
    ) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )

    return res.json({
      token,
      user: await getUserInfo(user),
    })
  } catch (error) {
    next(error)
  }
}

async function getMe(req, res, next) {
  try {
    return res.json({ user: await getUserInfo(req.user) })
  } catch (error) {
    next(error)
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('+password')

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'The account is unavailable.' })
    }

    const passwordMatches = await user.comparePassword(
      req.body.currentPassword,
    )

    if (!passwordMatches) {
      return res.status(400).json({
        message: 'The current password is incorrect.',
      })
    }

    user.password = req.body.newPassword
    user.isFirstLogin = false
    await user.save()

    return res.json({
      message: 'Password changed successfully.',
      user: await getUserInfo(user),
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { login, getMe, changePassword }
