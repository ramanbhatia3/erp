const express = require('express')
const { body, query } = require('express-validator')
const announcementController = require('../controllers/announcementController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [
  protect,
  authorizeRoles('superadmin', 'teacher', 'student', 'placementAdmin'),
]
const canPost = [protect, authorizeRoles('superadmin', 'teacher')]

router.get(
  '/',
  ...canRead,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.'),
  checkValidation,
  announcementController.listAnnouncements,
)

router.post(
  '/',
  ...canPost,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required.')
    .isLength({ max: 150 })
    .withMessage('Title must be 150 characters or fewer.'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required.')
    .isLength({ max: 5000 })
    .withMessage('Message must be 5000 characters or fewer.'),
  body('visibility')
    .isIn(['university', 'department', 'class'])
    .withMessage('Select a valid announcement visibility.'),
  body('department')
    .if(body('visibility').equals('department'))
    .isMongoId()
    .withMessage('Select a valid department.'),
  body('class')
    .if(body('visibility').equals('class'))
    .isMongoId()
    .withMessage('Select a valid class.'),
  checkValidation,
  announcementController.createAnnouncement,
)

module.exports = router
