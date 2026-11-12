const express = require('express')
const { query } = require('express-validator')
const User = require('../models/User')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [protect, authorizeRoles('superadmin', 'teacher', 'student', 'classAdvisor')]

router.get(
  '/availability',
  ...canRead,
  query('department').optional().isMongoId().withMessage('Department ID is invalid.'),
  checkValidation,
  async (req, res, next) => {
    try {
      const filter = { role: 'teacher', isActive: true }
      if (req.query.department) {
        filter.department = req.query.department
      }

      const faculty = await User.find(filter)
        .select('name email department availability maxLecturesPerDay maxLecturesPerWeek')
        .populate('department', 'name code')
        .sort({ name: 1 })

      return res.json({ faculty })
    } catch (error) {
      return next(error)
    }
  },
)

module.exports = router
