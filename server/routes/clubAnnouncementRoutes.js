const express = require('express')
const { body } = require('express-validator')
const clubAnnouncementController = require('../controllers/clubAnnouncementController')
const { protect, authorizeRoles } = require('../middleware/authMiddleware')
const checkValidation = require('../utils/authValidation')

const router = express.Router()
const canRead = [
  protect,
  authorizeRoles('superadmin', 'teacher', 'student', 'placementAdmin'),
]
const canPost = [protect, authorizeRoles('superadmin', 'teacher')]

router.get('/', ...canRead, clubAnnouncementController.listClubAnnouncements)
router.post(
  '/',
  ...canPost,
  body('club').isMongoId().withMessage('Select a valid club.'),
  body('title').trim().notEmpty().isLength({ max: 150 }).withMessage('Title is required and must be 150 characters or fewer.'),
  body('message').trim().notEmpty().isLength({ max: 5000 }).withMessage('Message is required and must be 5000 characters or fewer.'),
  checkValidation,
  clubAnnouncementController.createClubAnnouncement,
)

module.exports = router
