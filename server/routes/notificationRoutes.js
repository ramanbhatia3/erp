const express = require('express')
const { param, query } = require('express-validator')
const notificationController = require('../controllers/notificationController')
const { protect } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()

router.use(protect)

router.get(
  '/unread-count',
  notificationController.getUnreadCount,
)

router.patch(
  '/read-all',
  notificationController.markAllRead,
)

router.get(
  '/',
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.'),
  checkValidation,
  notificationController.listMine,
)

router.patch(
  '/:id/read',
  param('id').isMongoId().withMessage('Notification ID is invalid.'),
  checkValidation,
  notificationController.markRead,
)

module.exports = router
