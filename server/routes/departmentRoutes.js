const express = require('express')
const { body, param, query } = require('express-validator')
const departmentController = require('../controllers/departmentController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const superadminOnly = [protect, authorizeRoles('superadmin')]
const departmentReaders = [protect, authorizeRoles('superadmin', 'teacher')]

const nameValidation = body('name')
  .trim()
  .notEmpty()
  .withMessage('Department name is required.')
  .isLength({ max: 100 })
  .withMessage('Department name must be 100 characters or fewer.')

const codeValidation = body('code')
  .trim()
  .notEmpty()
  .withMessage('Department code is required.')
  .isLength({ max: 20 })
  .withMessage('Department code must be 20 characters or fewer.')
  .matches(/^[a-zA-Z0-9_-]+$/)
  .withMessage('Department code may contain letters, numbers, hyphens, and underscores.')
  .customSanitizer((code) => code.toUpperCase())

const hodValidation = body('hod')
  .optional({ nullable: true })
  .isMongoId()
  .withMessage('HOD must be a valid user ID.')

router.get(
  '/',
  ...departmentReaders,
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search must be 100 characters or fewer.'),
  checkValidation,
  departmentController.listDepartments,
)

router.get(
  '/teachers',
  ...superadminOnly,
  departmentController.listTeachers,
)

router.post(
  '/',
  ...superadminOnly,
  nameValidation,
  codeValidation,
  hodValidation,
  checkValidation,
  departmentController.createDepartment,
)

router.put(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('Department ID is invalid.'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department name cannot be empty.')
    .isLength({ max: 100 })
    .withMessage('Department name must be 100 characters or fewer.'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department code cannot be empty.')
    .isLength({ max: 20 })
    .withMessage('Department code must be 20 characters or fewer.')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Department code may contain letters, numbers, hyphens, and underscores.')
    .customSanitizer((code) => code.toUpperCase()),
  hodValidation,
  checkValidation,
  departmentController.updateDepartment,
)

router.delete(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('Department ID is invalid.'),
  checkValidation,
  departmentController.deleteDepartment,
)

module.exports = router
