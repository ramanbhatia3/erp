const express = require('express')
const { body, param, query } = require('express-validator')
const timetableController = require('../controllers/timetableController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [protect, authorizeRoles('superadmin', 'teacher', 'student', 'classAdvisor')]
const superadminOnly = [protect, authorizeRoles('superadmin')]

router.get('/config', ...canRead, timetableController.getConfiguration)
router.put(
  '/config',
  ...superadminOnly,
  body('startTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Start time must use HH:MM format.'),
  body('endTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('End time must use HH:MM format.'),
  body('lectureDuration').optional().isInt({ min: 30, max: 180 }).withMessage('Lecture duration must be between 30 and 180 minutes.'),
  body('numberOfPeriods').optional().isInt({ min: 1, max: 12 }).withMessage('Number of periods must be between 1 and 12.'),
  body('workingDays').optional().isArray({ min: 1 }).withMessage('Working days are required when provided.'),
  checkValidation,
  timetableController.updateConfiguration,
)

router.get(
  '/rooms',
  ...canRead,
  query('department').optional().isMongoId().withMessage('Department ID is invalid.'),
  checkValidation,
  timetableController.listRooms,
)

router.get(
  '/classes/:classId/data',
  ...canRead,
  param('classId').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  timetableController.getClassTimetableData,
)

router.get(
  '/classes/:classId',
  ...canRead,
  param('classId').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  timetableController.listClassTimetable,
)

router.post(
  '/validate',
  ...canRead,
  body('classId').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  timetableController.validateTimetableData,
)

router.post(
  '/generate',
  ...superadminOnly,
  body('classId').isMongoId().withMessage('Class ID is invalid.'),
  body('academicSession').optional().trim().isLength({ max: 20 }).withMessage('Academic session is too long.'),
  checkValidation,
  timetableController.generateClassTimetable,
)

router.get(
  '/faculty/:facultyId',
  ...canRead,
  param('facultyId').isMongoId().withMessage('Faculty ID is invalid.'),
  checkValidation,
  timetableController.listFacultyTimetable,
)

router.get('/conflicts', ...superadminOnly, timetableController.getConflicts)

module.exports = router
