const express = require('express')
const { body } = require('express-validator')
const settingsController = require('../controllers/settingsController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')
const { defaultMarksComponents } = require('../utils/markingScheme')

const router = express.Router()

router.get(
  '/',
  protect,
  authorizeRoles('superadmin', 'teacher'),
  settingsController.getSettings,
)

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
  body('marksComponents')
    .optional()
    .custom((components) =>
      Array.isArray(components) &&
      components.length === defaultMarksComponents.length &&
      defaultMarksComponents.every((configured, index) =>
        components[index]?.name === configured.name &&
        Number(components[index]?.maxMarks) === configured.maxMarks &&
        components[index]?.group === configured.group,
      ),
    )
    .withMessage('The 100-mark grading components are fixed and cannot be changed.'),
  checkValidation,
  settingsController.updateSettings,
)

module.exports = router
