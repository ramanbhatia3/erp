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

router.post(
  '/',
  ...superadminOnly,
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required and must be 100 characters or fewer.'),
  emailValidation,
  body('role').isIn(['teacher', 'student']).withMessage('Role must be teacher or student.'),
  body('department').isMongoId().withMessage('Select a valid department.'),
  body('class')
    .if(body('role').equals('student'))
    .isMongoId()
    .withMessage('Select a valid class for the student.'),
  body('section')
    .if(body('role').equals('student'))
    .trim()
    .notEmpty()
    .isLength({ max: 20 })
    .withMessage('Student section is required and must be 20 characters or fewer.'),
  body('rollNo')
    .if(body('role').equals('student'))
    .trim()
    .notEmpty()
    .isLength({ max: 30 })
    .withMessage('Student roll number is required and must be 30 characters or fewer.'),
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
  checkValidation,
  userController.updateUser,
)

router.patch(
  '/:id/deactivate',
  ...superadminOnly,
  param('id').isMongoId().withMessage('User ID is invalid.'),
  checkValidation,
  userController.deactivateUser,
)

module.exports = router
