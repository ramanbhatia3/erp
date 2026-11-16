const express = require('express')
const { body, param, query } = require('express-validator')
const classController = require('../controllers/classController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [protect, authorizeRoles('superadmin', 'teacher')]
const superadminOnly = [protect, authorizeRoles('superadmin')]

const departmentValidation = body('department')
  .isMongoId()
  .withMessage('Select a valid department.')
const nameValidation = body('name')
  .trim()
  .notEmpty()
  .withMessage('Class name is required.')
  .isLength({ max: 100 })
  .withMessage('Class name must be 100 characters or fewer.')
const semesterValidation = body('semester')
  .isInt({ min: 1, max: 8 })
  .withMessage('Semester must be between 1 and 8.')
  .toInt()
router.get(
  '/',
  ...canRead,
  query('department').optional().isMongoId().withMessage('Department ID is invalid.'),
  query('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester is invalid.'),
  checkValidation,
  classController.listClasses,
)

router.get(
  '/:id/subjects',
  ...canRead,
  param('id').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  classController.getClassSubjects,
)

router.get(
  '/:id/faculty',
  ...canRead,
  param('id').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  classController.getClassFaculty,
)

router.post(
  '/',
  ...superadminOnly,
  departmentValidation,
  nameValidation,
  semesterValidation,
  checkValidation,
  classController.createClass,
)

router.put(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('Class ID is invalid.'),
  body('department').optional().isMongoId().withMessage('Select a valid department.'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('semester').optional().isInt({ min: 1, max: 8 }).toInt(),
  body('academicYear').optional().trim().notEmpty().isLength({ max: 20 }),
  checkValidation,
  classController.updateClass,
)

router.delete(
  '/:id',
  ...superadminOnly,
  param('id').isMongoId().withMessage('Class ID is invalid.'),
  checkValidation,
  classController.deleteClass,
)

module.exports = router
