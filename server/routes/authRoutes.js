const express = require('express')
const { body } = require('express-validator')
const authController = require('../controllers/authController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()

router.post(
  '/login',
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Enter a valid email address.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  checkValidation,
  authController.login,
)

router.get('/me', protect, authController.getMe)

router.patch(
  '/profile',
  protect,
  authorizeRoles('student'),
  body('studentProfile')
    .isObject()
    .withMessage('Student profile details must be provided.'),
  body('studentProfile')
    .custom((profile) => {
      if (!profile || typeof profile !== 'object') return false

      const allowedFields = [
        'mobileNumber',
        'dateOfBirth',
        'currentAddress',
        'permanentAddress',
        'fatherName',
        'motherName',
        'guardianName',
        'guardianPhone',
        'bloodGroup',
        'class10Board',
        'class10Percentage',
        'class12Board',
        'class12Percentage',
        'favoriteSports',
        'hobbies',
      ]
      return Object.keys(profile).every((field) => allowedFields.includes(field))
    })
    .withMessage('Student profile contains an unsupported field.'),
  body('studentProfile.mobileNumber')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .custom((value) => {
      const digits = value.replace(/\D/g, '')
      return /^\+?[0-9\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
    })
    .withMessage('Enter a valid mobile number.'),
  body('studentProfile.guardianPhone')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .custom((value) => {
      const digits = value.replace(/\D/g, '')
      return /^\+?[0-9\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
    })
    .withMessage('Enter a valid parent or guardian phone number.'),
  body('studentProfile.dateOfBirth')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Enter a valid date of birth.')
    .bail()
    .custom((value) => new Date(value) < new Date())
    .withMessage('Date of birth must be in the past.')
    .toDate(),
  body('studentProfile.currentAddress')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Current address must be 500 characters or fewer.'),
  body('studentProfile.permanentAddress')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Permanent address must be 500 characters or fewer.'),
  body('studentProfile.fatherName')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Father's name must be 100 characters or fewer."),
  body('studentProfile.motherName')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Mother's name must be 100 characters or fewer."),
  body('studentProfile.guardianName')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Parent or guardian name must be 100 characters or fewer.'),
  body('studentProfile.bloodGroup')
    .optional({ values: 'falsy' })
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Select a valid blood group.'),
  body('studentProfile.class10Board')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Class 10 board must be 100 characters or fewer.'),
  body('studentProfile.class10Percentage')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Class 10 percentage must be between 0 and 100.')
    .toFloat(),
  body('studentProfile.class12Board')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Class 12 board must be 100 characters or fewer.'),
  body('studentProfile.class12Percentage')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Class 12 percentage must be between 0 and 100.')
    .toFloat(),
  body('studentProfile.favoriteSports')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Favorite sports must be 200 characters or fewer.'),
  body('studentProfile.hobbies')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Hobbies must be 200 characters or fewer.'),
  checkValidation,
  authController.updateStudentProfile,
)

router.put(
  '/change-password',
  protect,
  authorizeRoles('superadmin'),
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required.'),
  body('newPassword')
    .isString()
    .bail()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
    .withMessage('New password must be no more than 72 bytes.'),
  checkValidation,
  authController.changePassword,
)

module.exports = router
