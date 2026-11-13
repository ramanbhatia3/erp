const express = require('express')
const { body, param } = require('express-validator')
const clubController = require('../controllers/clubController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [
  protect,
  authorizeRoles('superadmin', 'teacher', 'student', 'placementAdmin'),
]
const canManage = [protect, authorizeRoles('superadmin', 'teacher')]

router.get('/', ...canRead, clubController.listClubs)

router.post(
  '/',
  ...canManage,
  body('name').trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required and must be 120 characters or fewer.'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('facultyCoordinator').if((value, { req }) => req.user.role === 'superadmin').isMongoId().withMessage('Select a valid faculty coordinator.'),
  body('members').optional().isArray().withMessage('Members must be a list of student IDs.'),
  body('members.*').optional().isMongoId().withMessage('A member ID is invalid.'),
  body('logo').optional({ checkFalsy: true }).isURL({ require_protocol: true }).withMessage('Logo must be a valid URL.'),
  checkValidation,
  clubController.createClub,
)

router.put(
  '/:id',
  ...canManage,
  param('id').isMongoId().withMessage('Club ID is invalid.'),
  body('name').optional().trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required and must be 120 characters or fewer.'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('facultyCoordinator').optional().isMongoId().withMessage('Select a valid faculty coordinator.'),
  body('members').optional().isArray().withMessage('Members must be a list of student IDs.'),
  body('members.*').optional().isMongoId().withMessage('A member ID is invalid.'),
  body('logo').optional({ checkFalsy: true }).isURL({ require_protocol: true }).withMessage('Logo must be a valid URL.'),
  checkValidation,
  clubController.updateClub,
)

router.delete('/:id', ...canManage, param('id').isMongoId(), checkValidation, clubController.deleteClub)
router.post('/:id/join', ...canRead, param('id').isMongoId(), checkValidation, clubController.joinClub)
router.delete('/:id/membership', ...canRead, param('id').isMongoId(), checkValidation, clubController.leaveClub)

module.exports = router
