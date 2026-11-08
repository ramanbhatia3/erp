const express = require('express')
const { body } = require('express-validator')
const settingsController = require('../controllers/settingsController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()

router.get('/', protect, settingsController.getSettings)

router.put(
  '/',
  protect,
  authorizeRoles('superadmin'),
  body('attendanceThreshold')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Attendance threshold must be between 0 and 100.')
    .toFloat(),
  body('passingPercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Passing percentage must be between 0 and 100.')
    .toFloat(),
  body('currentAcademicYear')
    .trim()
    .notEmpty()
    .isLength({ max: 20 })
    .withMessage('Academic year is required and must be 20 characters or fewer.'),
  body('currentSemester')
    .isInt({ min: 1, max: 12 })
    .withMessage('Current semester must be between 1 and 12.')
    .toInt(),
  body('marksComponents')
    .isArray({ min: 1, max: 30 })
    .withMessage('Add between 1 and 30 marks components.'),
  body('marksComponents.*')
    .isObject()
    .withMessage('Each marks component must be an object.'),
  body('marksComponents.*.name')
    .trim()
    .notEmpty()
    .isLength({ max: 50 })
    .withMessage('Component names are required and must be 50 characters or fewer.'),
  body('marksComponents.*.maxMarks')
    .isFloat({ gt: 0, max: 1000 })
    .withMessage('Component maximum marks must be greater than 0 and no more than 1000.')
    .toFloat(),
  checkValidation,
  settingsController.updateSettings,
)

module.exports = router
