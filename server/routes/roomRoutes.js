const express = require('express')
const { query } = require('express-validator')
const timetableController = require('../controllers/timetableController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [protect, authorizeRoles('superadmin', 'teacher', 'student', 'classAdvisor')]

router.get(
  '/',
  ...canRead,
  query('department').optional().isMongoId().withMessage('Department ID is invalid.'),
  checkValidation,
  timetableController.listRooms,
)

module.exports = router
