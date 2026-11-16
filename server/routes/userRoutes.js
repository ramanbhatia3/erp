const express = require('express')
const multer = require('multer')
const { body, param, query } = require('express-validator')
const userController = require('../controllers/userController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const superadminOnly = [protect, authorizeRoles('superadmin')]
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
})

function handleCsvUpload(req, res, next) {
  uploadCsv.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'CSV file must be 1 MB or smaller.' })
    }

    if (error) return next(error)
    return next()
  })
}

const emailValidation = body('email')
  .trim()
  .normalizeEmail()
  .isEmail()
  .withMessage('Enter a valid email address.')
const passwordValidation = body('password')
  .isString()
  .withMessage('Password must be text.')
  .bail()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters.')
  .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
  .withMessage('Password must be no more than 72 bytes.')

router.get(
  '/me/services',
  protect,
  authorizeRoles('student'),
  userController.getMyStudentServices,
)

router.get(
  '/',
  ...superadminOnly,
  query('role').optional().isIn(['teacher', 'student']).withMessage('Role filter is invalid.'),
  query('department').optional().isMongoId().withMessage('Department filter is invalid.'),
  query('class').optional().isMongoId().withMessage('Class filter is invalid.'),
  query('active').optional().isIn(['true', 'false']).withMessage('Active filter is invalid.'),
  query('search').optional().trim().isLength({ max: 100 }),
  checkValidation,
  userController.listUsers,
)

router.get(
  '/teachers',
  ...superadminOnly,
  query('department').optional().isMongoId().withMessage('Department filter is invalid.'),
  checkValidation,
  userController.listTeachers,
)

router.post(
  '/students/upload',
  ...superadminOnly,
  handleCsvUpload,
  userController.uploadStudentsCsv,
)

router.put(
  '/classes/:classId/advisor',
  ...superadminOnly,
  param('classId').isMongoId().withMessage('Class ID is invalid.'),
  body('advisor')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Advisor must be a valid user ID.'),
  checkValidation,
  userController.assignClassAdvisor,
)

router.patch(
  '/:id/services',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  body().custom((value) =>
    value && (
      Object.hasOwn(value, 'hostel') ||
      Object.hasOwn(value, 'hostelRoom') ||
      Object.hasOwn(value, 'usesTransport')
    ),
  ).withMessage('Provide a hostel, room, or transport assignment to update.'),
  body('hostel')
    .optional({ nullable: true })
    .isIn(['', 'girls-hostel-a', 'girls-hostel-b', 'boys-hostel-a', 'boys-hostel-b'])
    .withMessage('Choose one of the available hostels or leave the hostel unassigned.'),
  body('usesTransport')
    .optional()
    .isBoolean()
    .withMessage('Transport use must be true or false.')
    .toBoolean(),
  body('hostelRoom')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Hostel room must be 30 characters or fewer.'),
  checkValidation,
  userController.updateStudentServices,
)

router.patch(
  '/:id/fees/:semester',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  param('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8.')
    .toInt(),
  body('paid').isObject().withMessage('Provide paid amounts for all fee types.'),
  ...['academic', 'hostel', 'transportation', 'exam'].map((fee) =>
    body(`paid.${fee}`)
      .isFloat({ min: 0, max: 100000 })
      .withMessage(`${fee} paid amount must be between 0 and 100000.`)
      .toFloat(),
  ),
  checkValidation,
  userController.updateStudentSemesterFees,
)

router.post(
  '/',
  ...superadminOnly,
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required and must be 100 characters or fewer.'),
  emailValidation,
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student.'),
  body('department').isMongoId().withMessage('Select a valid department.'),
  passwordValidation,
  body('class')
    .if(body('role').equals('student'))
    .isMongoId()
    .withMessage('Select a valid class for the student.'),
  body('section')
    .if(body('role').equals('student'))
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Student section must be 20 characters or fewer.'),
  body('rollNo')
    .if(body('role').equals('student'))
    .trim()
    .notEmpty()
    .isLength({ max: 30 })
    .withMessage('Student roll number is required and must be 30 characters or fewer.'),
  body('startingYear')
    .if(body('role').equals('student'))
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Student starting year must be between 2000 and 2100.')
    .toInt(),
  checkValidation,
  userController.createUser,
)

router.put(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().trim().normalizeEmail().isEmail().withMessage('Enter a valid email address.'),
  body('department').optional().isMongoId().withMessage('Select a valid department.'),
  body('class').optional().isMongoId().withMessage('Select a valid class.'),
  body('section').optional().trim().notEmpty().isLength({ max: 20 }),
  body('rollNo').optional().trim().notEmpty().isLength({ max: 30 }),
  body('startingYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Student starting year must be between 2000 and 2100.')
    .toInt(),
  checkValidation,
  userController.updateUser,
)

router.patch(
  '/:id/password',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  passwordValidation,
  checkValidation,
  userController.setUserPassword,
)

router.patch(
  '/:id/remove-from-class',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  checkValidation,
  userController.removeStudentFromClass,
)

router.patch(
  '/:id/status',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  body('isActive').isBoolean().withMessage('Account status must be active or suspended.'),
  checkValidation,
  userController.setUserStatus,
)

module.exports = router
