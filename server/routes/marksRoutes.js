const express = require('express')
const { body, param } = require('express-validator')
const marksController = require('../controllers/marksController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const teachersOnly = [protect, authorizeRoles('teacher')]

const componentArrayValidation = body('components')
  .isArray({ min: 1, max: 30 })
  .withMessage('Provide marks for the configured components.')
const componentNameValidation = body('components.*.name')
  .trim()
  .notEmpty()
  .isLength({ max: 50 })
  .withMessage('Each component must have a valid name.')
const componentMarksValidation = body('components.*.marksObtained')
  .isFloat({ min: 0 })
  .withMessage('Marks obtained must be zero or greater.')
  .toFloat()
const componentMaxValidation = body('components.*.maxMarks')
  .isFloat({ gt: 0 })
  .withMessage('Component maximum marks must be greater than zero.')
  .toFloat()

router.post(
  '/',
  ...teachersOnly,
  body('student').isMongoId().withMessage('Select a valid student.'),
  body('subject').isMongoId().withMessage('Select a valid subject.'),
  componentArrayValidation,
  componentNameValidation,
  componentMarksValidation,
  componentMaxValidation,
  checkValidation,
  marksController.createMarks,
)

router.put(
  '/:id',
  ...teachersOnly,
  param('id').isMongoId().withMessage('Marks ID is invalid.'),
  componentArrayValidation,
  componentNameValidation,
  componentMarksValidation,
  componentMaxValidation,
  checkValidation,
  marksController.updateMarks,
)

router.get(
  '/class/:classId/subject/:subjectId',
  ...teachersOnly,
  param('classId').isMongoId().withMessage('Class ID is invalid.'),
  param('subjectId').isMongoId().withMessage('Subject ID is invalid.'),
  checkValidation,
  marksController.listClassSubjectMarks,
)

router.get(
  '/student/me',
  protect,
  authorizeRoles('student'),
  marksController.getStudentMarks,
)

module.exports = router
