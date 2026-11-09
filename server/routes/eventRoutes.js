const express = require('express')
const { body, param, query } = require('express-validator')
const eventController = require('../controllers/eventController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [
  protect,
  authorizeRoles('superadmin', 'teacher', 'student', 'placementAdmin'),
]
const canManage = [protect, authorizeRoles('superadmin', 'teacher')]
const eventTypes = [
  'holiday',
  'exam',
  'workshop',
  'seminar',
  'function',
  'competition',
  'placement',
  'deadline',
]
const visibilityTypes = ['university', 'department', 'class']

router.get(
  '/',
  ...canRead,
  query('from').optional().isISO8601().withMessage('Start date is invalid.'),
  query('to').optional().isISO8601().withMessage('End date is invalid.'),
  query('to')
    .optional()
    .custom((to, { req }) => !req.query.from || new Date(to) >= new Date(req.query.from))
    .withMessage('End date must be on or after the start date.'),
  query('type').optional().isIn(eventTypes).withMessage('Event type is invalid.'),
  checkValidation,
  eventController.listEvents,
)

router.post(
  '/',
  ...canManage,
  body('title').trim().notEmpty().isLength({ max: 150 }).withMessage('Title is required and must be 150 characters or fewer.'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('type').isIn(eventTypes).withMessage('Select a valid event type.'),
  body('date').isISO8601().withMessage('Select a valid event date.'),
  body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Select a valid end date.'),
  body('visibility').isIn(visibilityTypes).withMessage('Select a valid event visibility.'),
  body('department').if(body('visibility').equals('department')).isMongoId().withMessage('Select a valid department.'),
  body('class').if(body('visibility').equals('class')).isMongoId().withMessage('Select a valid class.'),
  checkValidation,
  eventController.createEvent,
)

router.put(
  '/:id',
  ...canManage,
  param('id').isMongoId().withMessage('Event ID is invalid.'),
  body('title').optional().trim().notEmpty().isLength({ max: 150 }).withMessage('Title is required and must be 150 characters or fewer.'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('type').optional().isIn(eventTypes).withMessage('Select a valid event type.'),
  body('date').optional().isISO8601().withMessage('Select a valid event date.'),
  body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Select a valid end date.'),
  body('visibility').optional().isIn(visibilityTypes).withMessage('Select a valid event visibility.'),
  body('department').optional().isMongoId().withMessage('Select a valid department.'),
  body('class').optional().isMongoId().withMessage('Select a valid class.'),
  body('department')
    .if(body('visibility').equals('department'))
    .isMongoId()
    .withMessage('Select a valid department.'),
  body('class')
    .if(body('visibility').equals('class'))
    .isMongoId()
    .withMessage('Select a valid class.'),
  checkValidation,
  eventController.updateEvent,
)

router.delete(
  '/:id',
  ...canManage,
  param('id').isMongoId().withMessage('Event ID is invalid.'),
  checkValidation,
  eventController.deleteEvent,
)

module.exports = router
