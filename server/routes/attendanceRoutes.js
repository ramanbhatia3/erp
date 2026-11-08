const express = require('express')
const { body, param, query } = require('express-validator')
const attendanceController = require('../controllers/attendanceController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const teachersOnly = [protect, authorizeRoles('teacher')]

const recordsValidation = body('records')
  .isArray({ min: 1, max: 500 })
  .withMessage('Provide attendance for 1 to 500 students.')
const studentValidation = body('records.*.student')
  .isMongoId()
  .withMessage('Each attendance record must have a valid student.')
const statusValidation = body('records.*.status')
  .isIn(['present', 'absent'])
  .withMessage('Attendance status must be present or absent.')

router.post(
  '/',
  ...teachersOnly,
  body('class').isMongoId().withMessage('Select a valid class.'),
  body('subject').isMongoId().withMessage('Select a valid subject.'),
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must use YYYY-MM-DD format.')
    .isISO8601({ strict: true })
    .withMessage('Enter a valid attendance date.'),
  body('lectureNo')
    .isInt({ min: 1, max: 30 })
    .withMessage('Lecture number must be between 1 and 30.')
    .toInt(),
  recordsValidation,
  studentValidation,
  statusValidation,
  checkValidation,
  attendanceController.createAttendance,
)

router.put(
  '/:id',
  ...teachersOnly,
  param('id').isMongoId().withMessage('Attendance ID is invalid.'),
  recordsValidation,
  studentValidation,
  statusValidation,
  checkValidation,
  attendanceController.updateAttendance,
)

router.get(
  '/class/:classId/students',
  ...teachersOnly,
  param('classId').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  attendanceController.listClassStudents,
)

router.get(
  '/class/:classId',
  ...teachersOnly,
  param('classId').isMongoId().withMessage('Class ID is invalid.'),
  query('subject').optional().isMongoId().withMessage('Subject ID is invalid.'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must use YYYY-MM-DD format.')
    .isISO8601({ strict: true })
    .withMessage('Enter a valid attendance date.'),
  checkValidation,
  attendanceController.listClassAttendance,
)

router.get(
  '/low-attendance',
  ...teachersOnly,
  query('classId').optional().isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  attendanceController.getLowAttendanceStudents,
)

router.get(
  '/student/me',
  protect,
  authorizeRoles('student'),
  attendanceController.getStudentAttendance,
)

module.exports = router
