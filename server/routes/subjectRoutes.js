const express = require('express')
const { body, param, query } = require('express-validator')
const subjectController = require('../controllers/subjectController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [protect, authorizeRoles('superadmin', 'teacher')]
const superadminOnly = [protect, authorizeRoles('superadmin')]

const nameValidation = body('name')
  .trim()
  .notEmpty()
  .withMessage('Subject name is required.')
  .isLength({ max: 100 })
  .withMessage('Subject name must be 100 characters or fewer.')
const codeValidation = body('code')
  .trim()
  .notEmpty()
  .withMessage('Subject code is required.')
  .isLength({ max: 20 })
  .withMessage('Subject code must be 20 characters or fewer.')
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Subject code may contain letters, numbers, hyphens, and underscores.')
  .customSanitizer((code) => code.toUpperCase())
const departmentValidation = body('department')
  .isMongoId()
  .withMessage('Select a valid department.')
const classValidation = body('class')
  .isMongoId()
  .withMessage('Select a valid class.')
const teacherValidation = body('teacher')
  .isMongoId()
  .withMessage('Select a valid teacher.')
const optionalSubjectMeta = [
  body('type').optional().isIn(['Theory', 'Practical', 'Lab', 'Elective']).withMessage('Select a valid subject type.'),
  body('weeklyPeriods').optional().isInt({ min: 1, max: 12 }).withMessage('Weekly periods must be between 1 and 12.').toInt(),
  body('roomType').optional().trim().notEmpty().withMessage('Room type is required when provided.'),
  body('isLab').optional().isBoolean().withMessage('Lab status must be true or false.'),
  body('requiresConsecutivePeriods').optional().isBoolean().withMessage('Consecutive period flag must be true or false.'),
  body('consecutivePeriodCount').optional().isInt({ min: 1, max: 6 }).withMessage('Consecutive period count must be between 1 and 6.').toInt(),
]

router.get(
  '/',
  ...canRead,
  query('department').optional().isMongoId().withMessage('Department ID is invalid.'),
  query('class').optional().isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  subjectController.listSubjects,
)

router.get(
  '/teachers',
  ...superadminOnly,
  query('department').isMongoId().withMessage('Select a valid department.'),
  checkValidation,
  subjectController.listTeachers,
)

router.post(
  '/',
  ...superadminOnly,
  nameValidation,
  codeValidation,
  departmentValidation,
  classValidation,
  teacherValidation,
  ...optionalSubjectMeta,
  checkValidation,
  subjectController.createSubject,
)

router.put(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('Subject ID is invalid.'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 20 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .customSanitizer((code) => code.toUpperCase()),
  body('department').optional().isMongoId(),
  body('class').optional().isMongoId(),
  body('teacher').optional().isMongoId(),
  ...optionalSubjectMeta,
  checkValidation,
  subjectController.updateSubject,
)

router.delete(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('Subject ID is invalid.'),
  checkValidation,
  subjectController.deleteSubject,
)

module.exports = router
