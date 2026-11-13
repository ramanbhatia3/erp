const express = require('express')
const { body, param, query } = require('express-validator')
const clubEventController = require('../controllers/clubEventController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [
  protect,
  authorizeRoles('superadmin', 'teacher', 'student', 'placementAdmin'),
]
const canManage = [protect, authorizeRoles('superadmin', 'teacher')]
const canParticipate = [protect, authorizeRoles('student')]

router.get(
  '/participation/me',
  ...canParticipate,
  clubEventController.myParticipation,
)
router.get(
  '/',
  ...canRead,
  query('clubId').optional().isMongoId().withMessage('Club ID is invalid.'),
  query('period').optional().isIn(['upcoming', 'past']).withMessage('Select a valid event period.'),
  checkValidation,
  clubEventController.listClubEvents,
)
router.post(
  '/',
  ...canManage,
  body('club').isMongoId().withMessage('Select a valid club.'),
  body('title').trim().notEmpty().isLength({ max: 150 }).withMessage('Title is required and must be 150 characters or fewer.'),
  body('date').isISO8601().withMessage('Select a valid event date.'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  checkValidation,
  clubEventController.createClubEvent,
)
router.put(
  '/:id',
  ...canManage,
  param('id').isMongoId().withMessage('Event ID is invalid.'),
  body('title').optional().trim().notEmpty().isLength({ max: 150 }).withMessage('Title is required and must be 150 characters or fewer.'),
  body('date').optional().isISO8601().withMessage('Select a valid event date.'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  checkValidation,
  clubEventController.updateClubEvent,
)
router.delete('/:id', ...canManage, param('id').isMongoId(), checkValidation, clubEventController.deleteClubEvent)
router.post(
  '/:id/register',
  ...canParticipate,
  param('id').isMongoId().withMessage('Event ID is invalid.'),
  checkValidation,
  clubEventController.registerForClubEvent,
)
router.delete(
  '/:id/registration',
  ...canParticipate,
  param('id').isMongoId().withMessage('Event ID is invalid.'),
  checkValidation,
  clubEventController.cancelClubEventRegistration,
)

module.exports = router
